const getStockPredictions = async (payload) => {
  const predictionUrl = process.env.ML_PREDICTION_URL;

  if (!predictionUrl) {
    return {
      success: false,
      predictions: [],
      message: 'ML_PREDICTION_URL is not configured',
    };
  }

  try {
    const response = await fetch(predictionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        predictions: [],
        message: data.message || 'ML prediction service failed',
      };
    }

    return {
      success: true,
      predictions: data.predictions || data,
      message: 'ML predictions loaded successfully',
    };
  } catch (error) {
    return {
      success: false,
      predictions: [],
      message: error.message,
    };
  }
};

module.exports = {
  getStockPredictions,
};
