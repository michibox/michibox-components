import React from 'react';
import PropTypes from 'prop-types';
import PulseLoader from 'react-spinners/PulseLoader';
import Modal from '../Modal';

const propTypes = {
    /**
     * The text to show
     *
     */
    message: PropTypes.string,
    progress: PropTypes.number,
};

const defaultProps = {
    message: 'sin información',
    progress: 0,
    show: false,
};

const ModalUploading = ({ show, message, progress }) => (
    <Modal
        show={!!show}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        backdrop="static"
        keyboard={false}
    >
        <Modal.Body>
            <div
                style={{
                    textAlign: 'center',
                    height: '8rem',
                    verticalAlign: 'middle',
                }}
            >
                <div
                    style={{
                        position: 'relative',
                        top: ' 1.0rem',
                    }}
                >
                    <span
                        style={{
                            fontSize: '1rem',
                            color: '#393C3E',
                            display: 'inline-block',
                            marginTop: '9px',
                        }}
                    >
                        {' '}
                        {message}
                    </span>

                    <PulseLoader color="#10312b" loading={true} size={5} />
                </div>

                <div
                    style={{
                        position: 'relative',
                        top: '1.5rem',
                        backgroundColor: 'grey',
                    }}
                >
                    <div className="progress">
                        <div
                            className="progress-bar progress-bar-success progress-bar-striped"
                            role="progressbar"
                            style={{ width: `${progress}%` }}
                        >
                            {progress}%
                        </div>
                    </div>
                </div>
            </div>
        </Modal.Body>
    </Modal>
);

ModalUploading.defaultProps = defaultProps;
ModalUploading.propTypes = propTypes;
export default ModalUploading;
