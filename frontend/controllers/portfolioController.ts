export const fetchPortfolio = async () => {
  try {
    const res = await fetch('https://octabyte.onrender.com/api/portfolio', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      let errorMessage = `Failed to fetch portfolio: ${res.status} ${res.statusText}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch {
        if (errorText) {
          errorMessage = errorText
        }
      }
      throw new Error(errorMessage)
    }
    
    return res.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Failed to connect to backend server. Please ensure the backend is running on http://localhost:3001')
    }
    throw error
  }
}
  