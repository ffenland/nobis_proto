// app/components/common/AlertModal.tsx
"use client";

interface AlertModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

const AlertModal = ({ isOpen, message, onClose }: AlertModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">알림</h3>
        <p className="py-4">{message}</p>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
