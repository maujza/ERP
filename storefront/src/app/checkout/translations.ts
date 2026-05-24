export type CheckoutTranslations = {
  requiredField: string;
  invalidPostal: string;
  invalidEmail: string;
  enterEmail: string;
  phone: string;
  phonePlaceholder: string;
  invalidPhone: string;
  invalidCard: string;
  expiryFormat: string;
  invalidCvc: string;
  selectInstallments: string;
  requiredAddress: string;
  requiredCity: string;
  enterCode: string;
  invalidCode: string;
  phoneHint: string;
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  email: string;
  emailPlaceholder: string;
  loginHint: string;
  loginAction: string;
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  saveInfo: string;
  completeAddress: string;
  card: string;
  mp: string;
  cash: string;
  transfer: string;
  cardHolder: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  installments: string;
  loadingInstallments: string;
  installmentsHint: string;
  sameBilling: string;
  billingAddress: string;
  summary: string;
  summaryMobile: string;
  variant: string;
  discountCode: string;
  apply: string;
  subtotal: string;
  shipping: string;
  discount: string;
  total: string;
  payNow: string;
  wpp: string;
  wppSend: string;
  paymentVia: string;
  paymentTitle: string;
  emptyCartTitle: string;
  emptyCartDesc: string;
  backHome: string;
  checkout: string;
  continueUnits: string;
  noStockVariant: string;
  checkoutChoiceTitle: string;
  checkoutChoiceBody: string;
  checkoutChoiceGuest: string;
  checkoutChoiceLogin: string;
  checkoutChoiceCancel: string;
  orderNumber: string;
};

export function getCheckoutTranslations(language: string): CheckoutTranslations {
  if (language === "ko") {
    return {
      requiredField: "필수 입력 항목",
      invalidPostal: "우편번호 형식이 올바르지 않습니다",
      invalidEmail: "이메일 형식이 올바르지 않습니다",
      enterEmail: "이메일을 입력하세요",
      phone: "WhatsApp 번호",
      phonePlaceholder: "+54 9 11 1234-5678",
      invalidPhone: "전화번호 형식이 올바르지 않습니다",
      invalidCard: "카드 번호가 올바르지 않습니다",
      expiryFormat: "형식 MM/AA",
      invalidCvc: "보안코드가 올바르지 않습니다",
      selectInstallments: "할부를 선택하세요",
      requiredAddress: "주소가 필요합니다",
      requiredCity: "도시를 입력하세요",
      enterCode: "코드를 입력하세요",
      invalidCode: "유효하지 않은 코드",
      phoneHint: "연락이 안 될 경우 이 번호로 연락드립니다.",
      step1: "1단계 - 연락처",
      step2: "2단계 - 배송지",
      step3: "3단계 - 배송 방식",
      step4: "4단계 - 결제",
      email: "이메일",
      emailPlaceholder: "mail@store.com",
      loginHint: "이미 계정이 있습니다.",
      loginAction: "로그인",
      firstName: "이름",
      lastName: "성",
      address: "주소",
      postalCode: "우편번호",
      city: "도시",
      province: "주",
      saveInfo: "내 정보 저장",
      completeAddress: "배송 계산을 위해 주소를 완료하세요.",
      card: "신용카드",
      mp: "메르카도파고",
      cash: "현금",
      transfer: "계좌이체",
      cardHolder: "카드 소유자",
      cardNumber: "카드 번호",
      expiry: "유효기간",
      cvc: "보안코드",
      installments: "할부",
      loadingInstallments: "할부 불러오는 중...",
      installmentsHint: "BIN 감지 후 할부 옵션이 표시됩니다.",
      sameBilling: "배송지 주소를 청구지로 사용",
      billingAddress: "청구지 주소",
      summary: "주문 요약",
      summaryMobile: "주문 요약",
      variant: "옵션 없음",
      discountCode: "할인 코드",
      apply: "적용",
      subtotal: "소계",
      shipping: "배송",
      discount: "할인",
      total: "총합",
      payNow: "지금 결제",
      wpp: "WhatsApp으로 주문",
      wppSend: "WhatsApp으로 보내기",
      paymentVia: "결제 방법",
      paymentTitle: "결제 방법 선택",
      emptyCartTitle: "장바구니가 비어 있습니다",
      emptyCartDesc: "결제를 시작하려면 상품을 추가하세요.",
      backHome: "홈으로",
      checkout: "결제로 이동",
      continueUnits: "개",
      noStockVariant: "단일 옵션",
      checkoutChoiceTitle: "주문을 어떻게 진행할까요?",
      checkoutChoiceBody: "계정으로 계속하거나 비회원으로 바로 결제할 수 있습니다.",
      checkoutChoiceGuest: "비회원으로 계속",
      checkoutChoiceLogin: "계정으로 계속",
      checkoutChoiceCancel: "닫기",
      orderNumber: "N° 주문",
    };
  }

  return {
    requiredField: "Campo obligatorio",
    invalidPostal: "Código postal inválido",
    invalidEmail: "Email inválido",
    enterEmail: "Ingresa tu email",
    phone: "Número de WhatsApp",
    phonePlaceholder: "+54 9 11 1234-5678",
    invalidPhone: "Número de teléfono inválido",
    invalidCard: "Número de tarjeta inválido",
    expiryFormat: "Formato MM/AA",
    invalidCvc: "Código inválido",
    selectInstallments: "Seleccioná las cuotas",
    requiredAddress: "Dirección requerida",
    requiredCity: "Ciudad requerida",
    enterCode: "Ingresá un código",
    invalidCode: "Código inválido",
    phoneHint: "Si el chat falla, te contactamos por este número.",
    step1: "Paso 1 - Contacto",
    step2: "Paso 2 - Dirección de envío",
    step3: "Paso 3 - Método de envío",
    step4: "Paso 4 - Pago",
    email: "Email",
    emailPlaceholder: "mail@tienda.com",
    loginHint: "Ya existe una cuenta con este email.",
    loginAction: "Iniciar sesión",
    firstName: "Nombre",
    lastName: "Apellidos",
    address: "Dirección",
    postalCode: "Código postal",
    city: "Ciudad",
    province: "Provincia",
    saveInfo: "Guardar mi información",
    completeAddress: "Completá la dirección para calcular envíos.",
    card: "Tarjeta de crédito",
    mp: "Mercado Pago",
    cash: "Efectivo",
    transfer: "Transferencia",
    cardHolder: "Titular",
    cardNumber: "Número de tarjeta",
    expiry: "Fecha de vencimiento",
    cvc: "Código de seguridad",
    installments: "Cuotas",
    loadingInstallments: "Cargando cuotas...",
    installmentsHint: "Las cuotas aparecen luego de detectar el BIN.",
    sameBilling: "Usar dirección de envío como facturación",
    billingAddress: "Dirección de facturación",
    summary: "Resumen del pedido",
    summaryMobile: "Resumen del pedido",
    variant: "Variante única",
    discountCode: "Código de descuento",
    apply: "Aplicar",
    subtotal: "Subtotal",
    shipping: "Envío",
    discount: "Descuento",
    total: "Total",
    payNow: "Pagar ahora",
    wpp: "Pedir por WhatsApp",
    wppSend: "Enviar pedido por WhatsApp",
    paymentVia: "Pago elegido",
    paymentTitle: "¿Cómo querés pagar?",
    emptyCartTitle: "Tu carrito está vacío",
    emptyCartDesc: "Agregá productos para iniciar la finalización de compra.",
    backHome: "Volver al inicio",
    checkout: "Finalizar compra",
    continueUnits: "unidades",
    noStockVariant: "Variante única",
    checkoutChoiceTitle: "¿Cómo querés finalizar?",
    checkoutChoiceBody: "Podés continuar con tu cuenta o terminar como invitado.",
    checkoutChoiceGuest: "Continuar sin cuenta",
    checkoutChoiceLogin: "Entrar con mi cuenta",
    checkoutChoiceCancel: "Cancelar",
    orderNumber: "N° pedido",
  };
}
