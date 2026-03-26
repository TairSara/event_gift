import './WhatsAppFloat.css';

export default function WhatsAppFloat() {
  const phoneNumber = '9720539488300';
  const whatsappUrl = `https://wa.me/${phoneNumber}`;

  const handleClick = () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'whatsapp_click' });
  };

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label="צור קשר בווטסאפ"
      onClick={handleClick}
    >
      <i className="fab fa-whatsapp"></i>
    </a>
  );
}
