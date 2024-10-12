from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from scipy.stats import norm

app = Flask(__name__)
CORS(app)  # Enable CORS

def black_scholes(S, K, T, r, sigma, option_type):
    """
    Black-Scholes model for European option pricing.
    """
    if T <= 0 or S <= 0 or K <= 0 or sigma <= 0:
        return None

    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    if option_type == 'call':
        price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        delta = norm.cdf(d1)
    elif option_type == 'put':
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        delta = -norm.cdf(-d1)
    else:
        return None

    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    vega = S * norm.pdf(d1) * np.sqrt(T)
    theta = (-S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) - \
        r * K * np.exp(-r * T) * (norm.cdf(d2) if option_type == 'call' else norm.cdf(-d2))
    rho = K * T * np.exp(-r * T) * (norm.cdf(d2) if option_type == 'call' else -norm.cdf(-d2))

    return {
        'optionPrice': price,
        'delta': delta,
        'gamma': gamma,
        'vega': vega / 100,   # Vega is per 1% change in volatility
        'theta': theta / 365, # Theta is per day
        'rho': rho / 100      # Rho is per 1% change in rates
    }

def manaster_koehler_initial_guess(S, K, T, r, option_price, option_type):
    """
    Calculate initial volatility guess using Manaster-Koehler approximation.
    """
    intrinsic_value = max(0, S - K) if option_type == 'call' else max(0, K - S)
    time_value = option_price - intrinsic_value
    if time_value <= 0:
        return 0.0001  # Small positive number to start

    return np.sqrt(2 * abs((np.log(S / K) + r * T) / T))

def implied_volatility(S, K, T, r, option_price, option_type):
    """
    Calculate implied volatility using Newton-Raphson and Bisection methods.
    """
    MAX_ITERATIONS = 100
    PRECISION = 1.0e-5

    # Initial guess using Manaster-Koehler approximation
    sigma = manaster_koehler_initial_guess(S, K, T, r, option_price, option_type)

    for i in range(MAX_ITERATIONS):
        bs_result = black_scholes(S, K, T, r, sigma, option_type)
        if bs_result is None:
            return None

        price = bs_result['optionPrice']
        vega = bs_result['vega'] * 100  # Convert back to original scale

        price_diff = price - option_price

        if abs(price_diff) < PRECISION:
            return sigma

        # Avoid division by zero
        if vega == 0:
            break

        sigma = sigma - price_diff / vega

    # If Newton-Raphson fails, use Bisection method
    # Set bounds
    sigma_low = 1e-5
    sigma_high = 5.0

    for i in range(MAX_ITERATIONS):
        sigma_mid = (sigma_low + sigma_high) / 2
        bs_result = black_scholes(S, K, T, r, sigma_mid, option_type)
        if bs_result is None:
            return None

        price = bs_result['optionPrice']
        price_diff = price - option_price

        if abs(price_diff) < PRECISION:
            return sigma_mid

        if price_diff > 0:
            sigma_high = sigma_mid
        else:
            sigma_low = sigma_mid

    return None  # Failed to converge

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.get_json()
    try:
        # Extract common parameters
        S = data.get('stockPrice')
        K = data.get('strikePrice')
        T = data.get('timeToMaturity')
        r = data.get('riskFreeRate')
        option_type = data.get('optionType')
        calc_type = data.get('calcType', 'optionPrice')

        # Validate and convert inputs
        errors = []
        if not S or float(S) <= 0:
            errors.append('Stock Price must be a positive number.')
        else:
            S = float(S)

        if not K or float(K) <= 0:
            errors.append('Strike Price must be a positive number.')
        else:
            K = float(K)

        if not T or float(T) <= 0:
            errors.append('Time to Maturity must be a positive number.')
        else:
            T = float(T)

        if r == '' or r is None:
            errors.append('Risk-Free Rate is required.')
        else:
            r = float(r)

        if option_type not in ['call', 'put']:
            errors.append('Option Type must be "call" or "put".')

        if errors:
            return jsonify({'error': ' '.join(errors)}), 400

        # Determine calculation type
        if calc_type == 'optionPrice':
            sigma = data.get('volatility')
            if not sigma or float(sigma) <= 0:
                return jsonify({'error': 'Volatility must be a positive number.'}), 400
            sigma = float(sigma)

            result = black_scholes(S, K, T, r, sigma, option_type)
            if result is None:
                return jsonify({'error': 'Error in Black-Scholes calculation.'}), 400

        elif calc_type == 'impliedVolatility':
            option_price = data.get('optionPrice')
            if not option_price or float(option_price) <= 0:
                return jsonify({'error': 'Option Price must be a positive number.'}), 400
            option_price = float(option_price)

            sigma = implied_volatility(S, K, T, r, option_price, option_type)
            if sigma is None:
                return jsonify({'error': 'Implied volatility calculation failed.'}), 400

            # Now calculate Greeks with the found implied volatility
            result = black_scholes(S, K, T, r, sigma, option_type)
            if result is None:
                return jsonify({'error': 'Error in Black-Scholes calculation.'}), 400

            result['impliedVolatility'] = sigma

        else:
            return jsonify({'error': 'Invalid calculation type.'}), 400

        # Convert numpy floats to native Python floats
        result = {k: float(v) for k, v in result.items()}
        return jsonify(result)

    except ValueError as ve:
        return jsonify({'error': f'Invalid input: {ve}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(port=5005)
