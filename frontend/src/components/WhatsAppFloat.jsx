import './WhatsAppFloat.css';

export default function WhatsAppFloat() {
  const phoneNumber = '9720539488300';
  const whatsappUrl = `https://wa.me/${phoneNumber}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label="צור קשר בווטסאפ"
    >
      <i className="fab fa-whatsapp"></i>
    </a>
  );
}
