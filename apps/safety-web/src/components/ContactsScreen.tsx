import React, { useState } from 'react';
import { VectorIcon } from './AppCommon';
import { CountryOption, COUNTRIES } from './AppCommon';

export interface TrustedContact {
  id: string;
  user_id: string;
  trusted_user_id: string;
  display_name: string;
  phone_normalized: string;
  avatar_url: string;
  relationship: string;
  created_at: string;
}

export interface ContactRequest {
  id: string;
  sender_user_id: string;
  recipient_user_id: string;
  sender_name?: string;
  sender_phone?: string;
  sender_avatar?: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_avatar?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
}

interface ContactsScreenProps {
  contacts: TrustedContact[];
  receivedRequests: ContactRequest[];
  sentRequests: ContactRequest[];
  currentUserId: string;
  onSendRequest: (phoneNormalized: string, name: string) => Promise<{ success: boolean; message: string }>;
  onAcceptRequest: (requestId: string) => Promise<void>;
  onRejectRequest: (requestId: string) => Promise<void>;
  onDeleteContact: (contactId: string) => Promise<void>;
  onOpenNativePicker: () => void;
  pickedContact?: { name: string; phone: string } | null;
  onPickedContactApplied?: () => void;
  showToast: (msg: string) => void;
}

export function ContactsScreen({
  contacts,
  receivedRequests,
  sentRequests,
  currentUserId,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onDeleteContact,
  onOpenNativePicker,
  pickedContact,
  onPickedContactApplied,
  showToast,
}: ContactsScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState<'contacts' | 'requests'>('contacts');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetPhone, setTargetPhone] = useState('');
  const [targetName, setTargetName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!pickedContact) return;
    setTargetName(pickedContact.name || '');
    const digits = pickedContact.phone.replace(/\D/g, '');
    const country = COUNTRIES.find((item) => digits.startsWith(item.dialCode.replace('+', '')));
    if (country) {
      setSelectedCountry(country);
      setTargetPhone(digits.slice(country.dialCode.replace('+', '').length));
    } else {
      setTargetPhone(digits);
    }
    setIsAddModalOpen(true);
    onPickedContactApplied?.();
  }, [pickedContact, onPickedContactApplied]);

  const pendingReceived = receivedRequests.filter((r) => r.status === 'pending');
  const pendingSent = sentRequests.filter((r) => r.status === 'pending');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = targetPhone.replace(/\D/g, '');
    if (!cleanDigits) {
      showToast('Ingresa un número telefónico');
      return;
    }

    const normalized = `${selectedCountry.dialCode}${cleanDigits}`;
    setIsSubmitting(true);
    const result = await onSendRequest(normalized, targetName.trim() || 'Contacto');
    setIsSubmitting(false);

    showToast(result.message);
    if (result.success) {
      setIsAddModalOpen(false);
      setTargetPhone('');
      setTargetName('');
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 20px',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, margin: 0, letterSpacing: '-0.3px' }}>
            Red de Confianza
          </h2>
          <p style={{ fontSize: '12px', color: '#AAA4B0', margin: '2px 0 0 0' }}>
            Personas con autorización mutua para recibir tus alertas SOS
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          style={{
            backgroundColor: '#F52D83',
            color: '#F8F5F8',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 16px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 0 16px rgba(245, 45, 131, 0.35)',
          }}
        >
          + Solicitar
        </button>
      </div>

      {/* SUB-TABS: Contactos Aceptados vs Solicitudes */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#1E1925',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '16px',
          border: '1px solid #282133',
        }}
      >
        <button
          onClick={() => setActiveSubTab('contacts')}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: activeSubTab === 'contacts' ? '#F52D83' : 'transparent',
            color: activeSubTab === 'contacts' ? '#F8F5F8' : '#AAA4B0',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Contactos ({contacts.length})
        </button>
        <button
          onClick={() => setActiveSubTab('requests')}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: activeSubTab === 'requests' ? '#F52D83' : 'transparent',
            color: activeSubTab === 'requests' ? '#F8F5F8' : '#AAA4B0',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s ease',
          }}
        >
          Solicitudes {pendingReceived.length > 0 && `(${pendingReceived.length})`}
          {pendingReceived.length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '10px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#FF304F',
              }}
            />
          )}
        </button>
      </div>

      {/* PESTAÑA 1: CONTACTOS MUTUOS ACEPTADOS */}
      {activeSubTab === 'contacts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {contacts.length === 0 ? (
            <div
              style={{
                backgroundColor: '#1E1925',
                borderRadius: '20px',
                border: '1px solid #282133',
                padding: '36px 20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(245, 45, 131, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <VectorIcon name="users" size={26} color="#FF83B9" />
              </div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#F8F5F8' }}>
                Sin contactos de auxilio activos
              </div>
              <p style={{ fontSize: '12px', color: '#AAA4B0', margin: '6px 0 18px 0', lineHeight: 1.4 }}>
                Envía una solicitud para que la persona confirme que desea ser tu contacto confiable.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#151219',
                  border: '1.5px solid #F52D83',
                  borderRadius: '12px',
                  color: '#FF83B9',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Enviar primera solicitud
              </button>
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                style={{
                  backgroundColor: '#1E1925',
                  border: '1px solid #282133',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#F8F5F8' }}>
                    {contact.display_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#AAA4B0', marginTop: '2px', fontFamily: 'monospace' }}>
                    {contact.phone_normalized}
                  </div>
                </div>

                <button
                  onClick={() => onDeleteContact(contact.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#706877',
                    cursor: 'pointer',
                    padding: '6px',
                  }}
                >
                  <VectorIcon name="cross" size={16} color="#706877" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* PESTAÑA 2: SOLICITUDES ENTRANTES Y SALIENTES */}
      {activeSubTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          {/* Solicitudes Recibidas */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#FF83B9', marginBottom: '8px', letterSpacing: '0.4px' }}>
              SOLICITUDES RECIBIDAS ({pendingReceived.length})
            </div>

            {pendingReceived.length === 0 ? (
              <div style={{ padding: '16px', backgroundColor: '#1E1925', borderRadius: '14px', border: '1px solid #282133', textAlign: 'center', fontSize: '12px', color: '#AAA4B0' }}>
                No tienes solicitudes pendientes de respuesta.
              </div>
            ) : (
              pendingReceived.map((req) => (
                <div
                  key={req.id}
                  style={{
                    backgroundColor: '#1E1925',
                    border: '1.5px solid #F52D83',
                    borderRadius: '16px',
                    padding: '14px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#F8F5F8' }}>
                    {req.sender_name || 'Usuario Atent'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#AAA4B0', marginTop: '2px', fontFamily: 'monospace' }}>
                    {req.sender_phone || 'Teléfono verificado'}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => onRejectRequest(req.id)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: '#151219',
                        color: '#AAA4B0',
                        border: '1px solid #2B2436',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => onAcceptRequest(req.id)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: '#F52D83',
                        color: '#F8F5F8',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Aceptar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Solicitudes Enviadas */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#AAA4B0', marginBottom: '8px', letterSpacing: '0.4px' }}>
              SOLICITUDES ENVIADAS ({pendingSent.length})
            </div>

            {pendingSent.length === 0 ? (
              <div style={{ padding: '16px', backgroundColor: '#1E1925', borderRadius: '14px', border: '1px solid #282133', textAlign: 'center', fontSize: '12px', color: '#AAA4B0' }}>
                No tienes solicitudes enviadas pendientes de confirmación.
              </div>
            ) : (
              pendingSent.map((req) => (
                <div
                  key={req.id}
                  style={{
                    backgroundColor: '#1E1925',
                    border: '1px solid #282133',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>
                      {req.recipient_phone || 'Número en espera'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#D29922', marginTop: '2px' }}>
                      Pendiente de aceptación
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: ENVIAR SOLICITUD A CONTACTO */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(9, 8, 13, 0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 250,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#1E1925',
              borderRadius: '24px',
              border: '1px solid #382F45',
              padding: '24px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>Enviar solicitud</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#AAA4B0', cursor: 'pointer' }}
              >
                <VectorIcon name="cross" size={18} color="#AAA4B0" />
              </button>
            </div>

            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#FF83B9', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                  Nombre de referencia
                </label>
                <input
                  type="text"
                  placeholder="Ej. Papá, Hermana, Amigo..."
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#151219',
                    border: '1px solid #2B2436',
                    borderRadius: '12px',
                    color: '#F8F5F8',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#FF83B9', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                  Número telefónico del contacto
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const c = COUNTRIES.find((cntry) => cntry.code === e.target.value) || COUNTRIES[0];
                      setSelectedCountry(c);
                    }}
                    style={{
                      width: '100px',
                      padding: '12px 6px',
                      backgroundColor: '#151219',
                      border: '1px solid #2B2436',
                      borderRadius: '12px',
                      color: '#F8F5F8',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.dialCode}
                      </option>
                    ))}
                  </select>

                  <input
                    type="tel"
                    required
                    placeholder="987654321"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value.replace(/\D/g, ''))}
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      backgroundColor: '#151219',
                      border: '1px solid #2B2436',
                      borderRadius: '12px',
                      color: '#F8F5F8',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onOpenNativePicker}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#151219',
                    color: '#FF83B9',
                    border: '1px solid #382F45',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  De mi agenda
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: isSubmitting ? '#706877' : '#F52D83',
                    color: '#F8F5F8',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
