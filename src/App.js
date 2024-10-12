import React, { useState } from 'react';
import './App.css';

// Import MUI components
import {
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Container,
  Typography,
  Paper,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';

function App() {
  const [optionData, setOptionData] = useState({
    stockPrice: '',
    strikePrice: '',
    timeToMaturity: '',
    riskFreeRate: '',
    volatility: '',
    optionPrice: '',
    optionType: 'call',
    calcType: 'optionPrice', // 'optionPrice' or 'impliedVolatility'
  });

  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    setOptionData({
      ...optionData,
      [e.target.name]: e.target.value,
    });
  };

  const validate = () => {
    let tempErrors = {};
    const {
      stockPrice,
      strikePrice,
      timeToMaturity,
      riskFreeRate,
      volatility,
      optionPrice,
      calcType,
    } = optionData;

    if (!stockPrice || stockPrice <= 0)
      tempErrors.stockPrice = 'Stock Price must be a positive number.';
    if (!strikePrice || strikePrice <= 0)
      tempErrors.strikePrice = 'Strike Price must be a positive number.';
    if (!timeToMaturity || timeToMaturity <= 0)
      tempErrors.timeToMaturity = 'Time to Maturity must be a positive number.';
    if (
      riskFreeRate === '' ||
      riskFreeRate === null ||
      isNaN(riskFreeRate)
    )
      tempErrors.riskFreeRate = 'Risk-Free Rate is required.';

    if (calcType === 'optionPrice') {
      if (!volatility || volatility <= 0)
        tempErrors.volatility = 'Volatility must be a positive number.';
    } else if (calcType === 'impliedVolatility') {
      if (!optionPrice || optionPrice <= 0)
        tempErrors.optionPrice = 'Option Price must be a positive number.';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Input validation
    if (!validate()) {
      return;
    }

    // Make API call to backend
    fetch('http://localhost:5005/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(optionData),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error);
          });
        }
        return response.json();
      })
      .then((data) => {
        setResult(data);
        setErrors({});
      })
      .catch((error) => {
        console.error('Error:', error);
        setResult(null);
        setErrors({ apiError: error.message });
      });
  };

  return (
    <Container
      maxWidth="sm"
      style={{
        backgroundColor: '#f0f8ff', // Light blue background
        padding: '20px',
        marginTop: '50px',
        borderRadius: '8px',
      }}
    >
      <Typography variant="h4" align="center" gutterBottom>
        Options Pricing Calculator
      </Typography>

      <FormControl component="fieldset" style={{ marginTop: '20px' }}>
        <RadioGroup
          row
          name="calcType"
          value={optionData.calcType}
          onChange={handleChange}
        >
          <FormControlLabel
            value="optionPrice"
            control={<Radio color="primary" />}
            label="Calculate Option Price"
          />
          <FormControlLabel
            value="impliedVolatility"
            control={<Radio color="primary" />}
            label="Calculate Implied Volatility"
          />
        </RadioGroup>
      </FormControl>

      <form onSubmit={handleSubmit} noValidate>
        <TextField
          label="Stock Price (S)"
          name="stockPrice"
          value={optionData.stockPrice}
          onChange={handleChange}
          error={!!errors.stockPrice}
          helperText={errors.stockPrice}
          fullWidth
          margin="normal"
          type="number"
          inputProps={{ step: 'any' }}
          required
        />
        <TextField
          label="Strike Price (K)"
          name="strikePrice"
          value={optionData.strikePrice}
          onChange={handleChange}
          error={!!errors.strikePrice}
          helperText={errors.strikePrice}
          fullWidth
          margin="normal"
          type="number"
          inputProps={{ step: 'any' }}
          required
        />
        <TextField
          label="Time to Maturity (T in years)"
          name="timeToMaturity"
          value={optionData.timeToMaturity}
          onChange={handleChange}
          error={!!errors.timeToMaturity}
          helperText={errors.timeToMaturity}
          fullWidth
          margin="normal"
          type="number"
          inputProps={{ step: 'any' }}
          required
        />
        <TextField
          label="Risk-Free Rate (r in decimal)"
          name="riskFreeRate"
          value={optionData.riskFreeRate}
          onChange={handleChange}
          error={!!errors.riskFreeRate}
          helperText={errors.riskFreeRate}
          fullWidth
          margin="normal"
          type="number"
          inputProps={{ step: 'any' }}
          required
        />

        {optionData.calcType === 'optionPrice' && (
          <TextField
            label="Volatility (σ in decimal)"
            name="volatility"
            value={optionData.volatility}
            onChange={handleChange}
            error={!!errors.volatility}
            helperText={errors.volatility}
            fullWidth
            margin="normal"
            type="number"
            inputProps={{ step: 'any' }}
            required
          />
        )}

        {optionData.calcType === 'impliedVolatility' && (
          <TextField
            label="Option Price"
            name="optionPrice"
            value={optionData.optionPrice}
            onChange={handleChange}
            error={!!errors.optionPrice}
            helperText={errors.optionPrice}
            fullWidth
            margin="normal"
            type="number"
            inputProps={{ step: 'any' }}
            required
          />
        )}

        <FormControl fullWidth margin="normal">
          <InputLabel id="option-type-label">Option Type</InputLabel>
          <Select
            labelId="option-type-label"
            name="optionType"
            value={optionData.optionType}
            onChange={handleChange}
            label="Option Type"
          >
            <MenuItem value="call">Call</MenuItem>
            <MenuItem value="put">Put</MenuItem>
          </Select>
        </FormControl>

        {errors.apiError && (
          <Alert severity="error" style={{ marginTop: '10px' }}>
            {errors.apiError}
          </Alert>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          style={{ marginTop: '20px' }}
        >
          Calculate
        </Button>
      </form>

      {result && (
        <Paper
          elevation={3}
          style={{ padding: '20px', marginTop: '30px', backgroundColor: '#e3f2fd' }}
        >
          <Typography variant="h5" gutterBottom>
            Result:
          </Typography>
          {optionData.calcType === 'impliedVolatility' && (
            <Typography>
              Implied Volatility: {(result.impliedVolatility * 100).toFixed(2)}%
            </Typography>
          )}
          <Typography>Option Price: {result.optionPrice.toFixed(4)}</Typography>
          <Typography>Delta: {result.delta.toFixed(4)}</Typography>
          <Typography>Gamma: {result.gamma.toFixed(4)}</Typography>
          <Typography>Theta: {result.theta.toFixed(4)}</Typography>
          <Typography>Vega: {result.vega.toFixed(4)}</Typography>
          <Typography>Rho: {result.rho.toFixed(4)}</Typography>
        </Paper>
      )}
    </Container>
  );
}

export default App;
