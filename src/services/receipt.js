// src/services/receipt.js
import { uploadReceipt } from './orders.js'

/**
 * Generates a receipt PNG canvas from order data.
 * Returns a canvas element.
 */
function buildReceiptCanvas(orderData) {
  const canvas    = document.createElement('canvas')
  const ctx       = canvas.getContext('2d')
  const width     = 480
  const padding   = 32
  const itemCount = orderData.items.length
  const height    = 520 + itemCount * 28

  canvas.width  = width
  canvas.height = height

  // Paper background
  ctx.fillStyle = '#f5f0e8'
  ctx.fillRect(0, 0, width, height)

  // Subtle texture
  ctx.fillStyle = 'rgba(0,0,0,0.02)'
  for (let i = 0; i < width; i += 4) {
    for (let j = 0; j < height; j += 4) {
      if (Math.random() > 0.7) ctx.fillRect(i, j, 1, 1)
    }
  }

  let y = 40

  // Header
  ctx.fillStyle = '#2c3e50'
  ctx.font      = 'italic 28px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText('CASA CARMARETTI', width / 2, y)

  y += 30
  ctx.font = '14px Georgia, serif'
  ctx.fillText('Fine Dining', width / 2, y)

  y += 20
  ctx.font      = '12px Arial, sans-serif'
  ctx.fillStyle = '#5a6a7a'
  ctx.fillText('Downtown Vinewood Power St.', width / 2, y)

  y += 16
  ctx.fillText('PH: 62618712', width / 2, y)

  // Separator
  function drawDash() {
    ctx.setLineDash([3, 3])
    ctx.strokeStyle = '#95a5a6'
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(width - padding, y)
    ctx.stroke()
    ctx.setLineDash([])
  }

  y += 20
  drawDash()

  // Receipt meta
  y += 25
  ctx.fillStyle = '#2c3e50'
  ctx.textAlign = 'left'
  ctx.font      = 'bold 13px Arial, sans-serif'
  ctx.fillText(`Fiş: ${orderData.name}`, padding, y)

  y += 22
  ctx.font      = '12px Arial, sans-serif'
  ctx.fillStyle = '#5a6a7a'
  ctx.fillText(`Tarih: ${orderData.date || new Date().toLocaleString('tr-TR')}`, padding, y)

  y += 18
  ctx.fillText(`Garson: ${orderData.waiterName}`, padding, y)

  y += 20
  drawDash()

  // Table header
  y += 30
  ctx.fillStyle = '#2c3e50'
  ctx.font      = 'bold 12px Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('Ürün', padding, y)
  ctx.fillText('Adet', 240, y)
  ctx.fillText('Birim', 300, y)
  ctx.textAlign = 'right'
  ctx.fillText('Ara Toplam', width - padding, y)

  // Items
  y += 10
  ctx.font = '12px Arial, sans-serif'
  let subtotal    = 0
  let serviceItem = null

  orderData.items.forEach((item) => {
    if (item.name === 'Servis Hizmeti') {
      serviceItem = item
      return
    }
    y += 28
    ctx.textAlign = 'left'
    ctx.fillStyle = '#2c3e50'
    ctx.fillText(item.name, padding, y)
    ctx.fillText(`x${item.qty}`, 250, y)
    ctx.fillText(`${item.price} $`, 300, y)
    ctx.textAlign = 'right'
    const itemTotal = item.qty * item.price
    ctx.fillText(`${itemTotal} $`, width - padding, y)
    subtotal += itemTotal
  })

  y += 25
  drawDash()

  // Totals
  y += 25
  ctx.textAlign = 'left'
  ctx.fillStyle = '#5a6a7a'
  ctx.font      = '12px Arial, sans-serif'
  ctx.fillText('Ara toplam', padding, y)
  ctx.textAlign = 'right'
  ctx.fillText(`${subtotal.toFixed(2)} $`, width - padding, y)

  y += 22
  ctx.textAlign = 'left'
  ctx.fillText('Servis', padding, y)
  ctx.textAlign = 'right'
  ctx.fillText(`${(serviceItem ? serviceItem.price : 200).toFixed(2)} $`, width - padding, y)

  y += 28
  ctx.fillStyle = '#2c3e50'
  ctx.font      = 'bold 14px Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('TOPLAM', padding, y)
  ctx.textAlign = 'right'
  ctx.fillText(`${orderData.total.toFixed(2)} $`, width - padding, y)

  y += 25
  drawDash()

  // Footer
  y += 25
  ctx.font      = '12px Arial, sans-serif'
  ctx.fillStyle = '#5a6a7a'
  ctx.textAlign = 'left'
  ctx.fillText('Ödeme yöntemi: Kart', padding, y)

  y += 20
  const receiptNo = Math.floor(1e12 + Math.random() * 9e12)
  ctx.fillText(`Fiş No: ${receiptNo}`, padding, y)

  y += 25
  drawDash()

  y += 30
  ctx.fillStyle = '#2c3e50'
  ctx.font      = 'bold 13px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Bizi tercih ettiğiniz için teşekkür ederiz!', width / 2, y)

  return canvas
}

/**
 * Generates receipt and uploads to Cloudinary. Returns the URL or null.
 */
export async function generateAndUploadReceipt(orderId, orderData) {
  try {
    const canvas = buildReceiptCanvas(orderData)
    const blob   = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return null
    return await uploadReceipt(orderId, blob)
  } catch (err) {
    console.error('Receipt generation failed:', err)
    return null
  }
}

/**
 * Downloads receipt: copies URL if exists, otherwise generates + uploads, falls back to local download.
 */
export async function downloadOrCopyReceipt(order, showToast) {
  if (order.receiptUrl) {
    try {
      await navigator.clipboard.writeText(order.receiptUrl)
      showToast?.('📋 Fiş URL\'i panoya kopyalandı!')
    } catch {
      window.open(order.receiptUrl, '_blank')
    }
    return
  }

  showToast?.('🔄 Fiş oluşturuluyor...')

  try {
    const canvas = buildReceiptCanvas(order)
    const blob   = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))

    if (blob) {
      const url = await uploadReceipt(order.id, blob)
      if (url) {
        try {
          await navigator.clipboard.writeText(url)
          showToast?.('✅ Fiş yüklendi ve URL kopyalandı!')
        } catch {
          window.open(url, '_blank')
          showToast?.('✅ Fiş yüklendi! Yeni sekmede açıldı.')
        }
        return
      }
    }

    // Fallback: local download
    const link    = document.createElement('a')
    link.download = `Fiş-${order.name}-${Date.now()}.png`
    link.href     = buildReceiptCanvas(order).toDataURL()
    link.click()
    showToast?.('📥 Fiş indirildi (çevrimdışı)')
  } catch (err) {
    console.error('Receipt generation failed:', err)
    showToast?.('Fiş oluşturulamadı!', 'danger')
  }
}
