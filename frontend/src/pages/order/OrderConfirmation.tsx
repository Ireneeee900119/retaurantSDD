interface Props {
  referenceNumber: string;
}

export default function OrderConfirmation({ referenceNumber }: Props) {
  return (
    <div className="confirmation">
      <div className="confirmation-icon">✓</div>
      <h2>訂單已送出！</h2>
      <p>您的訂單編號：</p>
      <div className="ref-number">{referenceNumber}</div>
      <p className="hint">請記下此編號以便查詢訂單狀態</p>
    </div>
  );
}
