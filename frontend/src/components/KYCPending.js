import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import './KYCStatus.css';

function KYCPending() {
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState({});
  const [documents, setDocuments] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
      navigate('/');
      return;
    }
    
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await api.get(`/auth/kyc-status/${user.id}`);
      setKycStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (documentType) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.pdf';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploadStatus(prev => ({ ...prev, [documentType]: 'uploading' }));

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', documentType);
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const response = await api.post(`/auth/upload-kyc-document/${user.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        setDocuments(prev => ({ ...prev, [documentType]: response.data }));
        setUploadStatus(prev => ({ ...prev, [documentType]: 'success' }));
        
        // Refresh KYC status
        await fetchKycStatus();
        
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadStatus(prev => ({ ...prev, [documentType]: 'error' }));
      }
    };
    
    fileInput.click();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return '✅';
      case 'pending':
        return '⏳';
      case 'rejected':
        return '❌';
      case 'under_review':
        return '🔍';
      default:
        return '📋';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return '#27ae60';
      case 'pending':
        return '#f39c12';
      case 'rejected':
        return '#e74c3c';
      case 'under_review':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  const getRequiredDocuments = () => {
    if (!kycStatus?.kyc_data) return [];
    
    const documents = [
      {
        type: 'primary_id_front',
        name: `${kycStatus.kyc_data.primary_id_type} (Front)`,
        required: true
      },
      {
        type: 'primary_id_back',
        name: `${kycStatus.kyc_data.primary_id_type} (Back)`,
        required: true
      },
      {
        type: 'proof_of_address',
        name: 'Proof of Address',
        required: true
      }
    ];

    if (kycStatus.kyc_data.secondary_id_type) {
      documents.push({
        type: 'secondary_id_front',
        name: `${kycStatus.kyc_data.secondary_id_type} (Front)`,
        required: false
      });
    }

    return documents;
  };

  if (loading) {
    return (
      <div className="kyc-status-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading KYC status...</p>
        </div>
      </div>
    );
  }

  if (!kycStatus) {
    return (
      <div className="kyc-status-container">
        <div className="error-card">
          <h2>KYC Status Not Found</h2>
          <p>Unable to load your KYC verification status.</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="kyc-status-container">
      <div className="kyc-status-card">
        <div className="status-header">
          <div className="status-icon" style={{ color: getStatusColor(kycStatus.status) }}>
            {getStatusIcon(kycStatus.status)}
          </div>
          <h1>KYC Verification Status</h1>
          <div className="status-badge" style={{ backgroundColor: getStatusColor(kycStatus.status) }}>
            {kycStatus.status.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        <div className="status-content">
          {/* Current Status */}
          <div className="status-section">
            <h3>Current Status</h3>
            {kycStatus.status === 'pending' && (
              <div className="status-message">
                <p>Your KYC application is pending. Please upload the required documents to proceed.</p>
                <div className="next-steps">
                  <h4>Next Steps:</h4>
                  <ul>
                    <li>Upload all required identity documents</li>
                    <li>Ensure documents are clear and readable</li>
                    <li>Wait for our team to review your application</li>
                  </ul>
                </div>
              </div>
            )}

            {kycStatus.status === 'under_review' && (
              <div className="status-message">
                <p>Your documents are being reviewed by our compliance team. This usually takes 1-3 business days.</p>
                <div className="review-info">
                  <h4>Review Timeline:</h4>
                  <ul>
                    <li>Document verification: 1-2 business days</li>
                    <li>Compliance screening: 1 business day</li>
                    <li>Final approval: Same day</li>
                  </ul>
                </div>
              </div>
            )}

            {kycStatus.status === 'verified' && (
              <div className="status-message success">
                <p>🎉 Congratulations! Your KYC verification is complete. You can now access all trading features.</p>
                <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
                  Go to Dashboard
                </button>
              </div>
            )}

            {kycStatus.status === 'rejected' && (
              <div className="status-message error">
                <p>Your KYC application was rejected. Please check the reasons below and resubmit with corrected information.</p>
                {kycStatus.rejection_reason && (
                  <div className="rejection-reason">
                    <h4>Rejection Reason:</h4>
                    <p>{kycStatus.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document Upload Section */}
          {(kycStatus.status === 'pending' || kycStatus.status === 'rejected') && (
            <div className="documents-section">
              <h3>Required Documents</h3>
              <p>Please upload clear, readable images of the following documents:</p>
              
              <div className="documents-grid">
                {getRequiredDocuments().map((doc) => (
                  <div key={doc.type} className="document-card">
                    <div className="document-info">
                      <h4>{doc.name}</h4>
                      {doc.required && <span className="required-badge">Required</span>}
                    </div>
                    
                    <div className="upload-area">
                      {uploadStatus[doc.type] === 'uploading' ? (
                        <div className="upload-progress">
                          <div className="spinner small"></div>
                          <span>Uploading...</span>
                        </div>
                      ) : documents[doc.type] ? (
                        <div className="upload-success">
                          <span>✅ Uploaded</span>
                          <button 
                            onClick={() => handleDocumentUpload(doc.type)}
                            className="btn btn-secondary small"
                          >
                            Replace
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleDocumentUpload(doc.type)}
                          className="btn btn-outline"
                        >
                          Upload {doc.name}
                        </button>
                      )}
                      
                      {uploadStatus[doc.type] === 'error' && (
                        <div className="upload-error">
                          <span>❌ Upload failed</span>
                          <button 
                            onClick={() => handleDocumentUpload(doc.type)}
                            className="btn btn-secondary small"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="upload-guidelines">
                <h4>📋 Document Guidelines</h4>
                <ul>
                  <li>Documents must be government-issued and valid</li>
                  <li>Images should be clear, well-lit, and readable</li>
                  <li>Accepted formats: JPG, PNG, PDF (max 5MB each)</li>
                  <li>Ensure all corners and edges are visible</li>
                  <li>No photocopies or screenshots</li>
                </ul>
              </div>
            </div>
          )}

          {/* Progress Information */}
          <div className="progress-section">
            <h3>Verification Progress</h3>
            <div className="progress-steps">
              <div className={`progress-step ${kycStatus.data_submitted ? 'completed' : 'current'}`}>
                <div className="step-icon">1</div>
                <div className="step-info">
                  <h4>Information Submitted</h4>
                  <p>Personal and financial information provided</p>
                </div>
              </div>
              
              <div className={`progress-step ${kycStatus.documents_uploaded ? 'completed' : kycStatus.data_submitted ? 'current' : 'pending'}`}>
                <div className="step-icon">2</div>
                <div className="step-info">
                  <h4>Documents Uploaded</h4>
                  <p>Identity and address verification documents</p>
                </div>
              </div>
              
              <div className={`progress-step ${kycStatus.status === 'under_review' ? 'current' : kycStatus.status === 'verified' ? 'completed' : 'pending'}`}>
                <div className="step-icon">3</div>
                <div className="step-info">
                  <h4>Under Review</h4>
                  <p>Compliance team reviewing your application</p>
                </div>
              </div>
              
              <div className={`progress-step ${kycStatus.status === 'verified' ? 'completed' : 'pending'}`}>
                <div className="step-icon">4</div>
                <div className="step-info">
                  <h4>Verification Complete</h4>
                  <p>Account approved for full trading access</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Support */}
          <div className="support-section">
            <h3>Need Help?</h3>
            <p>If you have questions about your KYC verification or need assistance, please contact our support team.</p>
            <div className="support-options">
              <a href="mailto:support@tradenom.com" className="support-link">
                📧 Email Support
              </a>
              <a href="/help/kyc" className="support-link">
                📚 KYC Help Center
              </a>
            </div>
          </div>
        </div>

        <div className="status-footer">
          <button onClick={() => navigate('/')} className="btn btn-secondary">
            Back to Login
          </button>
          <button onClick={fetchKycStatus} className="btn btn-outline">
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}

export default KYCPending;
