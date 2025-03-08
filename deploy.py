import os
import re
import shutil
import subprocess
import datetime
from pathlib import Path

# Configuration
PLUGIN_DIR = r"X:/Obsidian/Link/content/.obsidian/plugins/linkplugin"
CHANGELOG_FILE = "CHANGELOG.md"
PACKAGE_JSON = "package.json"
MANIFEST_JSON = "manifest.json"
BUILD_FILES = ["main.js", "manifest.json", "styles.css"]

def get_current_version():
    """Read current version from package.json"""
    with open(PACKAGE_JSON, 'r') as f:
        content = f.read()
        match = re.search(r'"version":\s*"([^"]+)"', content)
        if match:
            return match.group(1)
    return None

def update_version(version_type="patch"):
    """
    Update version in package.json and manifest.json
    version_type can be "major", "minor", or "patch"
    """
    current = get_current_version()
    if not current:
        print("Error: Could not determine current version")
        return False
    
    # Parse version
    major, minor, patch = map(int, current.split('.'))
    
    # Increment version
    if version_type == "major":
        major += 1
        minor = 0
        patch = 0
    elif version_type == "minor":
        minor += 1
        patch = 0
    else:  # patch
        patch += 1
    
    new_version = f"{major}.{minor}.{patch}"
    print(f"Updating version: {current} -> {new_version}")
    
    # Update package.json
    with open(PACKAGE_JSON, 'r') as f:
        content = f.read()
    
    content = re.sub(r'("version":\s*")[^"]+(")','\\1' + new_version + '\\2', content)
    
    with open(PACKAGE_JSON, 'w') as f:
        f.write(content)
    
    # Update manifest.json
    with open(MANIFEST_JSON, 'r') as f:
        content = f.read()
    
    content = re.sub(r'("version":\s*")[^"]+(")','\\1' + new_version + '\\2', content)
    
    with open(MANIFEST_JSON, 'w') as f:
        f.write(content)
    
    return new_version

def update_changelog(version, changes):
    """Add new version entry to changelog"""
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    
    with open(CHANGELOG_FILE, 'r') as f:
        content = f.readlines()
    
    # Find the position to insert new version
    insert_pos = 0
    for i, line in enumerate(content):
        if line.startswith("## ["):
            insert_pos = i
            break
    
    # Create new version entry
    new_entry = [
        f"## [{version}] - {today}\n",
        "\n"
    ]
    
    # Add changes by category
    for category, items in changes.items():
        if items:
            new_entry.append(f"### {category}\n")
            new_entry.append("\n")
            for item in items:
                new_entry.append(f"- {item}\n")
            new_entry.append("\n")
    
    # Insert new entry
    content = content[:insert_pos] + new_entry + content[insert_pos:]
    
    with open(CHANGELOG_FILE, 'w') as f:
        f.writelines(content)
    
    print(f"Updated changelog with version {version}")
    return True

def build():
    """Build the plugin"""
    print("Building plugin...")
    try:
        subprocess.run(["npm", "run", "build"], check=True, shell=True)
        return True
    except subprocess.CalledProcessError:
        print("Error: Build failed")
        return False

def deploy():
    """Deploy to Obsidian plugin directory"""
    print(f"Deploying to {PLUGIN_DIR}...")
    
    # Create plugin dir if it doesn't exist
    if not os.path.exists(PLUGIN_DIR):
        os.makedirs(PLUGIN_DIR, exist_ok=True)
    
    # Clean existing files
    for item in os.listdir(PLUGIN_DIR):
        item_path = os.path.join(PLUGIN_DIR, item)
        if os.path.isfile(item_path):
            os.remove(item_path)
    
    # Copy new files
    for file in BUILD_FILES:
        if os.path.exists(file):
            shutil.copy2(file, os.path.join(PLUGIN_DIR, file))
            print(f"Copied {file} to {PLUGIN_DIR}")
        else:
            print(f"Warning: {file} not found")
    
    return True

def commit_changes(version):
    """Commit changes to git"""
    try:
        subprocess.run(["git", "add", CHANGELOG_FILE, PACKAGE_JSON, MANIFEST_JSON], check=True, shell=True)
        subprocess.run(["git", "commit", "-m", f"Bump version to {version} and update changelog"], check=True, shell=True)
        print(f"Committed version {version} to git")
        return True
    except subprocess.CalledProcessError:
        print("Error: Git commit failed")
        return False

def main():
    print("=" * 50)
    print("OBSIDIAN LINK PLUGIN RELEASE PROCESS")
    print("=" * 50)
    
    # Get version type
    version_type = input("Enter version type (patch, minor, major) [patch]: ").strip().lower() or "patch"
    if version_type not in ["patch", "minor", "major"]:
        print(f"Invalid version type: {version_type}. Using 'patch'")
        version_type = "patch"
    
    # Get changes
    print("\nEnter changes for each category (leave blank to skip):")
    changes = {}
    
    for category in ["Added", "Changed", "Fixed", "Removed"]:
        print(f"\n{category} changes:")
        items = []
        while True:
            item = input(f"- {category} (leave blank to finish): ").strip()
            if not item:
                break
            items.append(item)
        changes[category] = items
    
    # Update version
    new_version = update_version(version_type)
    if not new_version:
        return
    
    # Update changelog
    if not update_changelog(new_version, changes):
        return
    
    # Commit changes
    if not commit_changes(new_version):
        return
    
    # Build
    if not build():
        return
    
    # Deploy
    if not deploy():
        return
    
    print("\n" + "=" * 50)
    print(f"Successfully released version {new_version}")
    print("Don't forget to restart Obsidian to load the updated plugin")
    print("=" * 50)

if __name__ == "__main__":
    main() 