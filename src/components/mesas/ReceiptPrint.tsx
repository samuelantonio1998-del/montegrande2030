import { useRef } from 'react';
import { type Mesa, PRICING, getAdultPrice, calcMesaTotal } from '@/lib/mock-data';

interface ReceiptPrintProps {
  mesa: Mesa;
  onPrinted: () => void;
}

export function printReceipt(mesa: Mesa) {
  const { coverTotal, beverageTotal, total } = calcMesaTotal(mesa);
  const adultPrice = getAdultPrice();
  const now = new Date();

  const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Conta Mesa ${mesa.number}</title>
<style>
  @page { margin: 5mm; size: 80mm auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    width: 80mm;
    padding: 4mm;
    color: #000;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; padding: 1px 0; }
  .header { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
  .total-row { font-size: 14px; font-weight: bold; }
  .small { font-size: 10px; color: #555; }
  .section-title { font-weight: bold; margin-top: 6px; margin-bottom: 2px; font-size: 11px; text-transform: uppercase; }
</style>
</head>
<body>
  <div class="center">
    <div class="header">MONTE GRANDE</div>
    <div class="small">Restaurante</div>
  </div>

  <div class="line"></div>

  <div class="row">
    <span>Mesa:</span>
    <span class="bold">${mesa.number}</span>
  </div>
  <div class="row">
    <span>Data:</span>
    <span>${now.toLocaleDateString('pt-PT')}</span>
  </div>
  <div class="row">
    <span>Hora:</span>
    <span>${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
  </div>
  ${mesa.openedAt ? `
  <div class="row">
    <span>Aberta às:</span>
    <span>${new Date(mesa.openedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
  </div>` : ''}
  ${mesa.waiter ? `
  <div class="row">
    <span>Funcionário:</span>
    <span>${mesa.waiter}</span>
  </div>` : ''}

  <div class="line"></div>

  <div class="section-title">Refeições</div>
  ${mesa.adults > 0 ? `
  <div class="row">
    <span>${mesa.adults}x Adulto</span>
    <span>€${(mesa.adults * adultPrice).toFixed(2)}</span>
  </div>` : ''}
  ${mesa.children2to6 > 0 ? `
  <div class="row">
    <span>${mesa.children2to6}x Criança 2-6</span>
    <span>€${(mesa.children2to6 * PRICING.child2to6).toFixed(2)}</span>
  </div>` : ''}
  ${mesa.children7to12 > 0 ? `
  <div class="row">
    <span>${mesa.children7to12}x Criança 7-12</span>
    <span>€${(mesa.children7to12 * PRICING.child7to12).toFixed(2)}</span>
  </div>` : ''}

  ${mesa.beverages.length > 0 ? `
  <div class="line"></div>
  <div class="section-title">Bebidas</div>
  ${mesa.beverages.map(b => `
  <div class="row">
    <span>${b.quantity}x ${b.name}</span>
    <span>€${(b.quantity * b.unitPrice).toFixed(2)}</span>
  </div>`).join('')}
  ` : ''}

  <div class="line"></div>

  ${coverTotal > 0 ? `
  <div class="row">
    <span>Subtotal Refeições</span>
    <span>€${coverTotal.toFixed(2)}</span>
  </div>` : ''}
  ${beverageTotal > 0 ? `
  <div class="row">
    <span>Subtotal Bebidas</span>
    <span>€${beverageTotal.toFixed(2)}</span>
  </div>` : ''}

  <div class="line"></div>

  <div class="row total-row">
    <span>TOTAL</span>
    <span>€${total.toFixed(2)}</span>
  </div>

  <div class="line"></div>

  <div class="center small" style="margin-top: 8px;">
    IVA incluído à taxa legal em vigor
  </div>
  <div class="center small" style="margin-top: 8px;">
    Obrigado pela sua visita!
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=320,height=600');
  if (printWindow) {
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.addEventListener('afterprint', () => printWindow.close());
  }
}
