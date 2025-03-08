import moment from 'moment'
import type { Moment } from 'moment'

// Helper to get the correct moment instance
export const getMoment = () => {
  return (window as any).moment || moment
}

// Wrapper functions for common moment operations
export const formatDate = (date: string | Date | Moment) =>
  moment(date).format('YYYY-MM-DD')
export const formatTime = () => moment().format('HH:mm')
export const subtractDay = (date: string | Date | Moment) =>
  moment(date).subtract(1, 'day')
export const addDay = (date: string | Date | Moment) =>
  moment(date).add(1, 'day')
export const getCurrentMoment = () => moment()

export const getCurrentDate = () => {
  return getMoment()()
}

export const parseDate = (dateString: string) => {
  return getMoment()(dateString)
}

export const addDays = (date: Date | string, days: number) => {
  return getMoment()(date).add(days, 'days')
}

export const subtractDays = (date: Date | string, days: number) => {
  return getMoment()(date).subtract(days, 'days')
}

export default moment
