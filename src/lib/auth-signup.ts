export const signupConfirmationMessage = 'Revisá tu correo y la carpeta de spam para confirmar tu cuenta. Si ya tenías una cuenta, iniciá sesión con el método que usaste al crearla.';

export function signupErrorMessage(code: string | undefined) {
  switch (code) {
    case 'email_address_not_authorized':
      return 'El servicio de correo no permite enviar la confirmación a esta dirección. Si ya tenés cuenta, podés iniciar sesión con tu método habitual.';
    case 'over_email_send_rate_limit':
      return 'Se alcanzó el límite de envíos de correo. Esperá antes de volver a intentar.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Probá iniciar sesión con el método que usaste para esa cuenta.';
    case 'weak_password':
      return 'Elegí una contraseña más segura.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Revisá el correo y los datos del registro.';
    default:
      return 'No pudimos completar el registro. Volvé a intentar.';
  }
}
