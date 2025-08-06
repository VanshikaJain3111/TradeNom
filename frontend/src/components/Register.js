import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AuthForm.css';
import './KYCForm.css';

function Register() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic account info
    email: '',
    password: '',
    confirmPassword: '',
    
    // Personal Information
    first_name: '',
    last_name: '',
    middle_name: '',
    date_of_birth: '',
    nationality: '',
    gender: '',
    
    // Contact Information
    phone_number: '',
    alternate_phone: '',
    
    // Address Information
    street_address: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: '',
    
    // Identity Documents
    primary_id_type: '',
    primary_id_number: '',
    primary_id_expiry: '',
    secondary_id_type: '',
    secondary_id_number: '',
    
    // Financial Information
    annual_income: '',
    employment_status: '',
    employer_name: '',
    occupation: '',
    
    // Trading Experience
    trading_experience: '',
    investment_goals: '',
    risk_tolerance: '',
    
    // Compliance
    politically_exposed: false,
    source_of_funds: '',
    
    // Agreement and Consent
    terms_accepted: false,
    privacy_consent: false,
    marketing_consent: false
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState({});
  const [kycRequirements, setKycRequirements] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch KYC requirements
    fetchKycRequirements();
  }, []);

  const fetchKycRequirements = async () => {
    try {
      const response = await api.get('/auth/kyc-requirements');
      setKycRequirements(response.data);
    } catch (error) {
      console.error('Failed to fetch KYC requirements:', error);
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1: // Account Information
        if (!formData.email) newErrors.email = 'Email is required';
        if (!formData.password) newErrors.password = 'Password is required';
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        if (formData.password && formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }
        break;

      case 2: // Personal Information
        if (!formData.first_name) newErrors.first_name = 'First name is required';
        if (!formData.last_name) newErrors.last_name = 'Last name is required';
        if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
        if (!formData.nationality) newErrors.nationality = 'Nationality is required';
        break;

      case 3: // Contact & Address
        if (!formData.phone_number) newErrors.phone_number = 'Phone number is required';
        if (!formData.street_address) newErrors.street_address = 'Street address is required';
        if (!formData.city) newErrors.city = 'City is required';
        if (!formData.state_province) newErrors.state_province = 'State/Province is required';
        if (!formData.postal_code) newErrors.postal_code = 'Postal code is required';
        if (!formData.country) newErrors.country = 'Country is required';
        break;

      case 4: // Identity Documents
        if (!formData.primary_id_type) newErrors.primary_id_type = 'Primary ID type is required';
        if (!formData.primary_id_number) newErrors.primary_id_number = 'Primary ID number is required';
        if (!formData.primary_id_expiry) newErrors.primary_id_expiry = 'ID expiry date is required';
        break;

      case 5: // Financial Information
        if (!formData.annual_income) newErrors.annual_income = 'Annual income is required';
        if (!formData.employment_status) newErrors.employment_status = 'Employment status is required';
        if (!formData.source_of_funds) newErrors.source_of_funds = 'Source of funds is required';
        break;

      case 6: // Trading Experience
        if (!formData.trading_experience) newErrors.trading_experience = 'Trading experience is required';
        if (!formData.investment_goals) newErrors.investment_goals = 'Investment goals are required';
        if (!formData.risk_tolerance) newErrors.risk_tolerance = 'Risk tolerance is required';
        break;

      case 7: // Terms & Conditions
        if (!formData.terms_accepted) newErrors.terms_accepted = 'You must accept the terms and conditions';
        if (!formData.privacy_consent) newErrors.privacy_consent = 'You must consent to the privacy policy';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const registrationData = {
        email: formData.email,
        password: formData.password,
        kyc_data: {
          // Personal Information
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name || null,
          date_of_birth: formData.date_of_birth,
          nationality: formData.nationality,
          gender: formData.gender || null,
          
          // Contact Information
          phone_number: formData.phone_number,
          alternate_phone: formData.alternate_phone || null,
          
          // Address Information
          street_address: formData.street_address,
          city: formData.city,
          state_province: formData.state_province,
          postal_code: formData.postal_code,
          country: formData.country,
          
          // Identity Documents
          primary_id_type: formData.primary_id_type,
          primary_id_number: formData.primary_id_number,
          primary_id_expiry: formData.primary_id_expiry,
          secondary_id_type: formData.secondary_id_type || null,
          secondary_id_number: formData.secondary_id_number || null,
          
          // Financial Information
          annual_income: formData.annual_income,
          employment_status: formData.employment_status,
          employer_name: formData.employer_name || null,
          occupation: formData.occupation || null,
          
          // Trading Experience
          trading_experience: formData.trading_experience,
          investment_goals: formData.investment_goals,
          risk_tolerance: formData.risk_tolerance,
          
          // Compliance
          politically_exposed: formData.politically_exposed,
          source_of_funds: formData.source_of_funds,
          
          // Agreement and Consent
          terms_accepted: formData.terms_accepted,
          privacy_consent: formData.privacy_consent,
          marketing_consent: formData.marketing_consent
        }
      };

      const response = await api.post('/auth/register-kyc', registrationData);
      
      // Store user data and redirect to KYC status page
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/kyc-pending', { state: { registrationResponse: response.data } });
      
    } catch (err) {
      console.error('Registration failed:', err);
      setErrors({ 
        submit: err.response?.data?.detail || 'Registration failed. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="kyc-step">
            <h3>Account Information</h3>
            <p className="step-description">Create your secure trading account</p>
            
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="Enter your email address"
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Create a strong password"
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
              <small className="helper-text">Password must be at least 8 characters long</small>
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="kyc-step">
            <h3>Personal Information</h3>
            <p className="step-description">Tell us about yourself for identity verification</p>
            
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className={`form-input ${errors.first_name ? 'error' : ''}`}
                  placeholder="First name"
                />
                {errors.first_name && <span className="error-text">{errors.first_name}</span>}
              </div>

              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className={`form-input ${errors.last_name ? 'error' : ''}`}
                  placeholder="Last name"
                />
                {errors.last_name && <span className="error-text">{errors.last_name}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Middle Name</label>
              <input
                type="text"
                name="middle_name"
                value={formData.middle_name}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Middle name (optional)"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  className={`form-input ${errors.date_of_birth ? 'error' : ''}`}
                />
                {errors.date_of_birth && <span className="error-text">{errors.date_of_birth}</span>}
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="form-input"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Nationality *</label>
              <input
                type="text"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                className={`form-input ${errors.nationality ? 'error' : ''}`}
                placeholder="Your nationality"
              />
              {errors.nationality && <span className="error-text">{errors.nationality}</span>}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="kyc-step">
            <h3>Contact & Address Information</h3>
            <p className="step-description">Provide your contact details and residential address</p>
            
            <div className="form-row">
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className={`form-input ${errors.phone_number ? 'error' : ''}`}
                  placeholder="+1234567890"
                />
                {errors.phone_number && <span className="error-text">{errors.phone_number}</span>}
              </div>

              <div className="form-group">
                <label>Alternate Phone</label>
                <input
                  type="tel"
                  name="alternate_phone"
                  value={formData.alternate_phone}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Alternate phone (optional)"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Street Address *</label>
              <input
                type="text"
                name="street_address"
                value={formData.street_address}
                onChange={handleInputChange}
                className={`form-input ${errors.street_address ? 'error' : ''}`}
                placeholder="Full street address"
              />
              {errors.street_address && <span className="error-text">{errors.street_address}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`form-input ${errors.city ? 'error' : ''}`}
                  placeholder="City"
                />
                {errors.city && <span className="error-text">{errors.city}</span>}
              </div>

              <div className="form-group">
                <label>State/Province *</label>
                <input
                  type="text"
                  name="state_province"
                  value={formData.state_province}
                  onChange={handleInputChange}
                  className={`form-input ${errors.state_province ? 'error' : ''}`}
                  placeholder="State or Province"
                />
                {errors.state_province && <span className="error-text">{errors.state_province}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Postal Code *</label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                  className={`form-input ${errors.postal_code ? 'error' : ''}`}
                  placeholder="Postal/ZIP code"
                />
                {errors.postal_code && <span className="error-text">{errors.postal_code}</span>}
              </div>

              <div className="form-group">
                <label>Country *</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className={`form-input ${errors.country ? 'error' : ''}`}
                  placeholder="Country"
                />
                {errors.country && <span className="error-text">{errors.country}</span>}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="kyc-step">
            <h3>Identity Documents</h3>
            <p className="step-description">Provide government-issued identification documents</p>
            
            <div className="form-row">
              <div className="form-group">
                <label>Primary ID Type *</label>
                <select
                  name="primary_id_type"
                  value={formData.primary_id_type}
                  onChange={handleInputChange}
                  className={`form-input ${errors.primary_id_type ? 'error' : ''}`}
                >
                  <option value="">Select ID type</option>
                  <option value="passport">Passport</option>
                  <option value="drivers_license">Driver's License</option>
                  <option value="national_id">National ID Card</option>
                  <option value="voter_id">Voter ID</option>
                </select>
                {errors.primary_id_type && <span className="error-text">{errors.primary_id_type}</span>}
              </div>

              <div className="form-group">
                <label>Primary ID Number *</label>
                <input
                  type="text"
                  name="primary_id_number"
                  value={formData.primary_id_number}
                  onChange={handleInputChange}
                  className={`form-input ${errors.primary_id_number ? 'error' : ''}`}
                  placeholder="ID number"
                />
                {errors.primary_id_number && <span className="error-text">{errors.primary_id_number}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>ID Expiry Date *</label>
              <input
                type="date"
                name="primary_id_expiry"
                value={formData.primary_id_expiry}
                onChange={handleInputChange}
                className={`form-input ${errors.primary_id_expiry ? 'error' : ''}`}
              />
              {errors.primary_id_expiry && <span className="error-text">{errors.primary_id_expiry}</span>}
            </div>

            <div className="form-section">
              <h4>Secondary ID (Optional)</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Secondary ID Type</label>
                  <select
                    name="secondary_id_type"
                    value={formData.secondary_id_type}
                    onChange={handleInputChange}
                    className="form-input"
                  >
                    <option value="">Select secondary ID type</option>
                    <option value="passport">Passport</option>
                    <option value="drivers_license">Driver's License</option>
                    <option value="national_id">National ID Card</option>
                    <option value="voter_id">Voter ID</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Secondary ID Number</label>
                  <input
                    type="text"
                    name="secondary_id_number"
                    value={formData.secondary_id_number}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Secondary ID number"
                  />
                </div>
              </div>
            </div>

            <div className="info-box">
              <h4>📋 Document Requirements</h4>
              <ul>
                <li>Documents must be government-issued and valid</li>
                <li>All information must be clearly visible</li>
                <li>Documents should not be expired</li>
                <li>You'll upload document images in the next step</li>
              </ul>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="kyc-step">
            <h3>Financial Information</h3>
            <p className="step-description">Help us understand your financial situation for compliance</p>
            
            <div className="form-row">
              <div className="form-group">
                <label>Annual Income *</label>
                <select
                  name="annual_income"
                  value={formData.annual_income}
                  onChange={handleInputChange}
                  className={`form-input ${errors.annual_income ? 'error' : ''}`}
                >
                  <option value="">Select income range</option>
                  <option value="0-25000">$0 - $25,000</option>
                  <option value="25000-50000">$25,000 - $50,000</option>
                  <option value="50000-100000">$50,000 - $100,000</option>
                  <option value="100000-250000">$100,000 - $250,000</option>
                  <option value="250000-500000">$250,000 - $500,000</option>
                  <option value="500000+">$500,000+</option>
                </select>
                {errors.annual_income && <span className="error-text">{errors.annual_income}</span>}
              </div>

              <div className="form-group">
                <label>Employment Status *</label>
                <select
                  name="employment_status"
                  value={formData.employment_status}
                  onChange={handleInputChange}
                  className={`form-input ${errors.employment_status ? 'error' : ''}`}
                >
                  <option value="">Select employment status</option>
                  <option value="employed">Employed</option>
                  <option value="self_employed">Self-Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="student">Student</option>
                  <option value="retired">Retired</option>
                </select>
                {errors.employment_status && <span className="error-text">{errors.employment_status}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Employer Name</label>
                <input
                  type="text"
                  name="employer_name"
                  value={formData.employer_name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Your employer (if applicable)"
                />
              </div>

              <div className="form-group">
                <label>Occupation</label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Your occupation"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Source of Funds *</label>
              <select
                name="source_of_funds"
                value={formData.source_of_funds}
                onChange={handleInputChange}
                className={`form-input ${errors.source_of_funds ? 'error' : ''}`}
              >
                <option value="">Select source of funds</option>
                <option value="salary">Salary/Employment</option>
                <option value="business">Business Income</option>
                <option value="investments">Investment Returns</option>
                <option value="inheritance">Inheritance</option>
                <option value="other">Other</option>
              </select>
              {errors.source_of_funds && <span className="error-text">{errors.source_of_funds}</span>}
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="politically_exposed"
                  checked={formData.politically_exposed}
                  onChange={handleInputChange}
                />
                I am a Politically Exposed Person (PEP) or related to one
              </label>
              <small className="helper-text">
                PEPs include government officials, senior executives of state-owned corporations, 
                important political party officials, senior military officials, and their family members.
              </small>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="kyc-step">
            <h3>Trading Experience & Investment Profile</h3>
            <p className="step-description">Help us tailor our services to your experience level</p>
            
            <div className="form-group">
              <label>Trading Experience *</label>
              <select
                name="trading_experience"
                value={formData.trading_experience}
                onChange={handleInputChange}
                className={`form-input ${errors.trading_experience ? 'error' : ''}`}
              >
                <option value="">Select your trading experience</option>
                <option value="none">No Experience</option>
                <option value="beginner">Beginner (0-1 years)</option>
                <option value="intermediate">Intermediate (1-5 years)</option>
                <option value="advanced">Advanced (5+ years)</option>
                <option value="professional">Professional Trader</option>
              </select>
              {errors.trading_experience && <span className="error-text">{errors.trading_experience}</span>}
            </div>

            <div className="form-group">
              <label>Investment Goals *</label>
              <select
                name="investment_goals"
                value={formData.investment_goals}
                onChange={handleInputChange}
                className={`form-input ${errors.investment_goals ? 'error' : ''}`}
              >
                <option value="">Select your primary investment goal</option>
                <option value="capital_growth">Capital Growth</option>
                <option value="income">Income Generation</option>
                <option value="speculation">Speculation</option>
                <option value="hedging">Hedging</option>
                <option value="diversification">Portfolio Diversification</option>
              </select>
              {errors.investment_goals && <span className="error-text">{errors.investment_goals}</span>}
            </div>

            <div className="form-group">
              <label>Risk Tolerance *</label>
              <select
                name="risk_tolerance"
                value={formData.risk_tolerance}
                onChange={handleInputChange}
                className={`form-input ${errors.risk_tolerance ? 'error' : ''}`}
              >
                <option value="">Select your risk tolerance</option>
                <option value="low">Low - I prefer stable investments</option>
                <option value="moderate">Moderate - I accept some risk for higher returns</option>
                <option value="high">High - I'm comfortable with significant risk</option>
                <option value="very_high">Very High - I accept maximum risk for maximum returns</option>
              </select>
              {errors.risk_tolerance && <span className="error-text">{errors.risk_tolerance}</span>}
            </div>

            <div className="info-box warning">
              <h4>⚠️ Risk Disclosure</h4>
              <p>
                Trading in financial instruments involves substantial risk and may not be suitable for all investors. 
                You could lose some or all of your initial investment. Please ensure you understand the risks involved.
              </p>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="kyc-step">
            <h3>Terms & Conditions</h3>
            <p className="step-description">Please review and accept our terms to complete registration</p>
            
            <div className="terms-section">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="terms_accepted"
                    checked={formData.terms_accepted}
                    onChange={handleInputChange}
                    className={errors.terms_accepted ? 'error' : ''}
                  />
                  I have read and accept the <a href="/terms" target="_blank">Terms and Conditions</a> *
                </label>
                {errors.terms_accepted && <span className="error-text">{errors.terms_accepted}</span>}
              </div>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="privacy_consent"
                    checked={formData.privacy_consent}
                    onChange={handleInputChange}
                    className={errors.privacy_consent ? 'error' : ''}
                  />
                  I consent to the collection and processing of my personal data as described in the <a href="/privacy" target="_blank">Privacy Policy</a> *
                </label>
                {errors.privacy_consent && <span className="error-text">{errors.privacy_consent}</span>}
              </div>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="marketing_consent"
                    checked={formData.marketing_consent}
                    onChange={handleInputChange}
                  />
                  I agree to receive marketing communications and updates (optional)
                </label>
              </div>
            </div>

            <div className="security-notice">
              <h4>🔒 Security & Privacy</h4>
              <ul>
                <li>All information is encrypted and stored securely</li>
                <li>We comply with financial industry security standards</li>
                <li>Your data will only be used for account verification and compliance</li>
                <li>You can update your privacy preferences anytime</li>
              </ul>
            </div>

            {errors.submit && (
              <div className="error-box">
                {errors.submit}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getProgressPercentage = () => {
    return (currentStep / 7) * 100;
  };

  return (
    <div className="kyc-registration-container">
      <div className="kyc-card">
        <div className="kyc-header">
          <h1>TradeNom Account Registration</h1>
          <p>Complete KYC verification to start trading</p>
          
          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
            <span className="progress-text">Step {currentStep} of 7</span>
          </div>
        </div>

        <div className="kyc-content">
          {renderStepContent()}
        </div>

        <div className="kyc-actions">
          {currentStep > 1 && (
            <button 
              type="button" 
              onClick={handlePrevious}
              className="btn btn-secondary"
            >
              Previous
            </button>
          )}
          
          {currentStep < 7 ? (
            <button 
              type="button" 
              onClick={handleNext}
              className="btn btn-primary"
            >
              Next
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          )}
        </div>

        <div className="auth-link">
          <span>Already have an account? </span>
          <button 
            onClick={() => {
              // Clear any existing user data and navigate to login
              localStorage.removeItem('user');
              navigate('/login');
            }} 
            className="auth-link-btn"
          >
            Login here
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;
