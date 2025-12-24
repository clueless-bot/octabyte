export const formatCurrency = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) {
    return '₹0.00'
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export const formatNumber = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) {
    return '0'
  }
  return new Intl.NumberFormat('en-IN').format(value)
}

export const formatPercentage = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) {
    return '0.00%'
  }
  return `${value.toFixed(2)}%`
}

export const formatPrice = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) {
    return '₹0.00'
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

