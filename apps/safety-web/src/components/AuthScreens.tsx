import React, { useState } from 'react';
import { CountryOption, COUNTRIES, VectorIcon, FullBodyCharacter } from './AppCommon';
import { supabase, normalizePhoneNumber, deriveAuthEmailFromPhone } from '../supabaseClient';

const MAX_AUTH_NAME_LENGTH = 80;
const MAX_AUTH_PASSWORD_LENGTH = 128;

function hasControlCharacters(value: string): boolean {
  return /[\u0000-\u001F\u007F]/.test(value);
}

interface AuthScreensProps {
  onAuthSuccess: (userProfile: any) => void;
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
  mode: 'welcome' | 'register' | 'login';
}

export function AuthScreens({
  onAuthSuccess,
  onNavigateToLogin,
  onNavigateToRegister,
  mode,
}: AuthScreensProps) {
  // Register state
  const [regLegalName, setRegLegalName] = useState('');
  const [regLegalSurname, setRegLegalSurname] = useState('');
  const [regCountry, setRegCountry] = useState<CountryOption>(COUNTRIES[0]); // Default Perú +51 🇵🇪
  const [regNationalPhone, setRegNationalPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Login state
  const [loginCountry, setLoginCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [loginNationalPhone, setLoginNationalPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ==========================================
  // REGISTRO
  // ==========================================
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanNational = regNationalPhone.replace(/\D/g, '');
    if (!regLegalName.trim() || !regLegalSurname.trim()) {
      setErrorMessage('Por favor ingresa tu nombre y apellido completo.');
      return;
    }
    if (
      regLegalName.trim().length > MAX_AUTH_NAME_LENGTH ||
      regLegalSurname.trim().length > MAX_AUTH_NAME_LENGTH ||
      hasControlCharacters(regLegalName) ||
      hasControlCharacters(regLegalSurname)
    ) {
      setErrorMessage('El nombre y apellido deben tener como máximo 80 caracteres.');
      return;
    }

    if (regCountry.code === 'PE') {
      if (cleanNational.length !== 9 || !cleanNational.startsWith('9')) {
        setErrorMessage('El teléfono en Perú debe tener 9 dígitos y empezar con 9 (ej. 987654321).');
        return;
      }
    } else {
      if (cleanNational.length < 7 || cleanNational.length > 15) {
        setErrorMessage('Por favor ingresa un número de teléfono válido.');
        return;
      }
    }

    if (regPassword.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (regPassword.length > MAX_AUTH_PASSWORD_LENGTH || hasControlCharacters(regPassword)) {
      setErrorMessage('La contraseña debe tener entre 6 y 128 caracteres válidos.');
      return;
    }

    setIsLoading(true);

    try {
      const normalizedPhone = normalizePhoneNumber(regCountry.dialCode, cleanNational);

      // 1. Invocar función RPC atómica en Supabase con verificación estricta de unicidad en base de datos
      const { data: rpcData, error: rpcError } = await supabase.rpc('app_register_user', {
        p_legal_name: regLegalName.trim(),
        p_legal_surname: regLegalSurname.trim(),
        p_phone_prefix: regCountry.dialCode,
        p_phone_national: cleanNational,
        p_phone_normalized: normalizedPhone,
        p_password: regPassword,
      });

      if (!rpcError && rpcData) {
        if (!rpcData.success) {
          // Requisito 3: Rechazar registro y mostrar mensaje exacto requerido
          if (rpcData.error && rpcData.error.includes('registrado')) {
            setErrorMessage('Este número ya tiene una cuenta. Inicia sesión o recupera tu acceso.');
          } else {
            setErrorMessage(rpcData.error || 'No fue posible registrar la cuenta.');
          }
          setIsLoading(false);
          return;
        }

        onAuthSuccess({ ...rpcData.user, isNew: true });
        setIsLoading(false);
        return;
      }

      // Si la RPC arroja error por duplicado o fallo del servidor
      if (rpcError) {
        if (rpcError.message?.includes('duplicate key') || rpcError.message?.includes('profiles_phone_normalized')) {
          setErrorMessage('Este número ya tiene una cuenta. Inicia sesión o recupera tu acceso.');
          setIsLoading(false);
          return;
        }

        // Si la tabla o RPC aún no está creada en la nube de Supabase:
        if (rpcError.message?.includes('Could not find') || rpcError.code === 'PGRST205' || rpcError.code === 'PGRST202') {
          setErrorMessage('Base de datos en proceso de inicialización en Supabase. Por favor ejecuta la migración SQL en tu panel.');
          setIsLoading(false);
          return;
        }

        setErrorMessage('No fue posible completar el registro. Inténtalo nuevamente.');
        setIsLoading(false);
        return;
      }

      setErrorMessage('No se recibió respuesta del servidor de autenticación.');
    } catch {
      setErrorMessage('No fue posible conectar con el servicio de autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // INICIO DE SESIÓN
  // ==========================================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanNational = loginNationalPhone.replace(/\D/g, '');
    if (!cleanNational) {
      setErrorMessage('Por favor ingresa tu número telefónico.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Por favor ingresa tu contraseña.');
      return;
    }
    if (cleanNational.length > 15 || loginPassword.length > MAX_AUTH_PASSWORD_LENGTH || hasControlCharacters(loginPassword)) {
      setErrorMessage('El número telefónico o la contraseña no tienen un formato válido.');
      return;
    }

    setIsLoading(true);

    try {
      const normalizedPhone = normalizePhoneNumber(loginCountry.dialCode, cleanNational);

      // 1. Autenticación directa por RPC telefónico en Supabase
      const { data: rpcData, error: rpcError } = await supabase.rpc('app_login_user', {
        p_phone_normalized: normalizedPhone,
        p_password: loginPassword,
      });

      if (!rpcError && rpcData) {
        if (!rpcData.success) {
          setErrorMessage(rpcData.error || 'Número telefónico o contraseña incorrectos.');
          setIsLoading(false);
          return;
        }

        onAuthSuccess({ ...rpcData.user, isNew: false });
        setIsLoading(false);
        return;
      }

      if (rpcError) {
        if (rpcError.message?.includes('Could not find') || rpcError.code === 'PGRST205' || rpcError.code === 'PGRST202') {
          setErrorMessage('Base de datos no inicializada en Supabase. Aplica la migración SQL.');
          setIsLoading(false);
          return;
        }
        setErrorMessage('No fue posible iniciar sesión. Inténtalo nuevamente.');
        setIsLoading(false);
        return;
      }

      setErrorMessage('Número telefónico o contraseña incorrectos.');
    } catch {
      setErrorMessage('No fue posible conectar con el servicio de autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // PANTALLA: BIENVENIDA
  // ==========================================
  if (mode === 'welcome') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px 24px 32px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
          <FullBodyCharacter mood="FELIZ" height={190} speechText="¡Bienvenido a Atent!" />
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              letterSpacing: '-0.5px',
              margin: '24px 0 8px 0',
              textAlign: 'center',
              color: '#F8F5F8',
            }}
          >
            Protección personal en tiempo real
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#AAA4B0',
              textAlign: 'center',
              margin: 0,
              maxWidth: '300px',
              lineHeight: 1.45,
            }}
          >
            Conéctate con tus personas de confianza y mantén tu seguridad en cada trayecto.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            id="btn-welcome-register"
            onClick={onNavigateToRegister}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#F52D83',
              color: '#F8F5F8',
              border: 'none',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 0 28px rgba(245, 45, 131, 0.45)',
            }}
          >
            Registrarse
          </button>

          <button
            id="btn-welcome-login"
            onClick={onNavigateToLogin}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#1E1925',
              color: '#FF83B9',
              border: '1.5px solid #F52D83',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // PANTALLA: REGISTRO
  // ==========================================
  if (mode === 'register') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '28px 24px',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <FullBodyCharacter mood="FELIZ" height={130} speechText="Crea tu cuenta segura" />
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
          Crear cuenta
        </h2>
        <p style={{ fontSize: '13px', color: '#AAA4B0', margin: '0 0 20px 0' }}>
          Ingresa tus datos para registrarte en la red de auxilio.
        </p>

        {errorMessage && (
          <div
            style={{
              backgroundColor: 'rgba(255, 48, 79, 0.15)',
              border: '1px solid #FF304F',
              borderRadius: '12px',
              padding: '12px 14px',
              color: '#FF83B9',
              fontSize: '13px',
              marginBottom: '16px',
              fontWeight: 600,
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#FF83B9', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
              Nombres
            </label>
            <input
              id="input-reg-name"
              type="text"
              required
              placeholder="Ej. Alonso"
              value={regLegalName}
              onChange={(e) => setRegLegalName(e.target.value)}
              style={{
                width: '100%',
                padding: '13px 14px',
                backgroundColor: '#1E1925',
                border: '1px solid #2B2436',
                borderRadius: '12px',
                color: '#F8F5F8',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#FF83B9', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
              Apellidos
            </label>
            <input
              id="input-reg-surname"
              type="text"
              required
              placeholder="Ej. Gonzales"
              value={regLegalSurname}
              onChange={(e) => setRegLegalSurname(e.target.value)}
              style={{
                width: '100%',
                padding: '13px 14px',
                backgroundColor: '#1E1925',
                border: '1px solid #2B2436',
                borderRadius: '12px',
                color: '#F8F5F8',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#FF83B9', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
              Número telefónico
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                id="select-reg-country"
                value={regCountry.code}
                onChange={(e) => {
                  const c = COUNTRIES.find((cntry) => cntry.code === e.target.value) || COUNTRIES[0];
                  setRegCountry(c);
                }}
                style={{
                  width: '110px',
                  padding: '13px 8px',
                  backgroundColor: '#1E1925',
                  border: '1px solid #2B2436',
                  borderRadius: '12px',
                  color: '#F8F5F8',
                  fontSize: '13px',
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
                id="input-reg-phone"
                type="tel"
                required
                placeholder={regCountry.code === 'PE' ? '987654321' : 'Número'}
                value={regNationalPhone}
                onChange={(e) => setRegNationalPhone(e.target.value.replace(/\D/g, ''))}
                style={{
                  flex: 1,
                  padding: '13px 14px',
                  backgroundColor: '#1E1925',
                  border: '1px solid #2B2436',
                  borderRadius: '12px',
                  color: '#F8F5F8',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#FF83B9', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-reg-password"
                type={showRegPassword ? 'text' : 'password'}
                required
                placeholder="Mínimo 6 caracteres"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '13px 44px 13px 14px',
                  backgroundColor: '#1E1925',
                  border: '1px solid #2B2436',
                  borderRadius: '12px',
                  color: '#F8F5F8',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowRegPassword(!showRegPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#AAA4B0',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <VectorIcon name={showRegPassword ? 'eye-off' : 'eye'} size={18} color="#AAA4B0" />
              </button>
            </div>
          </div>

          <button
            id="btn-submit-register"
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '12px',
              padding: '16px',
              backgroundColor: isLoading ? '#706877' : '#F52D83',
              color: '#F8F5F8',
              border: 'none',
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '15px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 24px rgba(245, 45, 131, 0.4)',
            }}
          >
            {isLoading ? 'Registrando...' : 'Completar registro'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ fontSize: '13px', color: '#AAA4B0' }}>¿Ya tienes una cuenta? </span>
          <button
            onClick={onNavigateToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#FF83B9',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            Inicia sesión
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // PANTALLA: INICIO DE SESIÓN
  // ==========================================
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 24px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        <FullBodyCharacter mood="FELIZ" height={150} speechText="Te extrañábamos" />
      </div>

      <h2 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 6px 0', letterSpacing: '-0.4px' }}>
        Iniciar sesión
      </h2>
      <p style={{ fontSize: '13px', color: '#AAA4B0', margin: '0 0 24px 0' }}>
        Ingresa con tu número telefónico registrado y tu contraseña.
      </p>

      {errorMessage && (
        <div
          style={{
            backgroundColor: 'rgba(255, 48, 79, 0.15)',
            border: '1px solid #FF304F',
            borderRadius: '12px',
            padding: '12px 14px',
            color: '#FF83B9',
            fontSize: '13px',
            marginBottom: '18px',
            fontWeight: 600,
          }}
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '12px', color: '#FF83B9', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
            Número telefónico
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              id="select-login-country"
              value={loginCountry.code}
              onChange={(e) => {
                const c = COUNTRIES.find((cntry) => cntry.code === e.target.value) || COUNTRIES[0];
                setLoginCountry(c);
              }}
              style={{
                width: '110px',
                padding: '13px 8px',
                backgroundColor: '#1E1925',
                border: '1px solid #2B2436',
                borderRadius: '12px',
                color: '#F8F5F8',
                fontSize: '13px',
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
              id="input-login-phone"
              type="tel"
              required
              placeholder={loginCountry.code === 'PE' ? '987654321' : 'Número'}
              value={loginNationalPhone}
              onChange={(e) => setLoginNationalPhone(e.target.value.replace(/\D/g, ''))}
              style={{
                flex: 1,
                padding: '13px 14px',
                backgroundColor: '#1E1925',
                border: '1px solid #2B2436',
                borderRadius: '12px',
                color: '#F8F5F8',
                fontSize: '14px',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#FF83B9', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
            Contraseña
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="input-login-password"
              type={showLoginPassword ? 'text' : 'password'}
              required
              placeholder="Ingresa tu contraseña"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '13px 44px 13px 14px',
                backgroundColor: '#1E1925',
                border: '1px solid #2B2436',
                borderRadius: '12px',
                color: '#F8F5F8',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setShowLoginPassword(!showLoginPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#AAA4B0',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <VectorIcon name={showLoginPassword ? 'eye-off' : 'eye'} size={18} color="#AAA4B0" />
            </button>
          </div>
        </div>

        <button
          id="btn-submit-login"
          type="submit"
          disabled={isLoading}
          style={{
            marginTop: '12px',
            padding: '16px',
            backgroundColor: isLoading ? '#706877' : '#F52D83',
            color: '#F8F5F8',
            border: 'none',
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '15px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 0 24px rgba(245, 45, 131, 0.4)',
          }}
        >
          {isLoading ? 'Comprobando...' : 'Entrar a Atent'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <span style={{ fontSize: '13px', color: '#AAA4B0' }}>¿Aún no tienes cuenta? </span>
        <button
          onClick={onNavigateToRegister}
          style={{
            background: 'none',
            border: 'none',
            color: '#FF83B9',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          Regístrate aquí
        </button>
      </div>
    </div>
  );
}
