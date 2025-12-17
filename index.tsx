import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Download, Play, Layers, Image as ImageIcon, RefreshCw, Settings, Search, AlertCircle, AlertTriangle, CreditCard, ShoppingBag, Upload, FileImage, Tag } from 'lucide-react';

// --- Types ---

interface Product {
  id: string;
  name: string;
  price: number;
  listPrice: number;
  imageUrl: string;
  installments: number; // e.g., 12, 6, 3
  freeShipping: boolean;
  sku: string;
  // New fields for specific badges seen in image
  bankPromo?: string; // e.g. "10% OFF 1 PAGO"
  pickup?: boolean;   // e.g. "RETIRO GRATIS"
}

// --- Constants & Styles ---

const COLORS = {
  pardoBlue: '#1e90ff', 
  orangeBadge: '#FF6600',
  debitBadge: '#0082D1', 
  pickupBadge: '#0082D1', 
  priceColor: '#FF6600',
};

// Default overlay file provided by user
const DEFAULT_OVERLAY = 'marco-ads-meta.png';

const DEMO_PRODUCT: Product = {
  id: 'demo-lg-86',
  name: 'Smart TV 86” UHD 4K Qned LG 86QNED85SQA',
  price: 6199999,
  listPrice: 0,
  imageUrl: 'https://images.fravega.com/f500/1d04400f0896024927500589d8544d65.jpg', // High quality TV image
  installments: 12,
  freeShipping: false,
  pickup: true,
  sku: '86QNED85SQA',
  bankPromo: '10% OFF 1 PAGO DÉBITO'
};

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: 'Roboto, sans-serif'
  },
  sidebar: {
    width: '350px',
    backgroundColor: '#fff',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column' as const,
    zIndex: 10,
  },
  main: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    padding: '2rem',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  header: {
    padding: '1.5rem',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: COLORS.pardoBlue,
    color: 'white',
  },
  productList: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  productItem: {
    padding: '1rem',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  activeItem: {
    backgroundColor: '#e6f0ff',
    borderLeft: `4px solid ${COLORS.pardoBlue}`,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    padding: '2rem',
    marginBottom: '2rem',
    maxWidth: '1100px',
    width: '100%',
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  canvasContainer: {
    width: '500px',
    height: '500px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    position: 'relative' as const,
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  controls: {
    flex: 1,
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    backgroundColor: COLORS.pardoBlue,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background 0.2s',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    border: `1px solid ${COLORS.pardoBlue}`,
    color: COLORS.pardoBlue,
  },
  input: {
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    width: '100%',
    marginBottom: '0.5rem'
  },
  fileInput: {
    fontSize: '0.8rem',
    marginTop: '0.5rem'
  },
  label: {
    fontWeight: 'bold' as const,
    marginBottom: '0.5rem',
    display: 'block',
    fontSize: '0.9rem',
    color: '#555',
  },
  badgeOption: {
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px', 
    padding: '8px', 
    backgroundColor: '#f8f9fa', 
    borderRadius: '4px',
    marginBottom: '5px'
  }
};

// --- Helper Functions ---

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);
};

const extractClusterId = (input: string) => {
  if (/^\d+$/.test(input.trim())) return input.trim();
  try {
    const url = new URL(input);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    if (url.searchParams.get('map')?.includes('productClusterIds')) {
        const mapParts = url.searchParams.get('map')!.split(',');
        const index = mapParts.indexOf('productClusterIds');
        if (index !== -1 && pathSegments[index]) return pathSegments[index];
    }
    const match = input.match(/pardo\.com\.ar\/(\d+)/);
    if (match && match[1]) return match[1];
  } catch (e) {}
  const digits = input.match(/(\d{3,})/); 
  return digits ? digits[0] : input;
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image`));
        img.src = src;
    });
};

// --- Main Application ---

function App() {
  const [products, setProducts] = useState<Product[]>([DEMO_PRODUCT]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(DEMO_PRODUCT);
  const [processing, setProcessing] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Data Fetching State
  const [clusterInput, setClusterInput] = useState('1970');
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Configuration State
  const [showPrice, setShowPrice] = useState(true);
  const [showBadges, setShowBadges] = useState(true); // Auto badges (installments/pickup)
  const [showBankBadge, setShowBankBadge] = useState(true); // Bank promo badge
  const [customOverlay, setCustomOverlay] = useState<string | null>(DEFAULT_OVERLAY); // Start with Pardo Frame

  // --- Data Fetching Logic (VTEX) ---
  
  const fetchClusterData = async () => {
    const id = extractClusterId(clusterInput);
    if (!id) return;
    
    setLoadingData(true);
    setErrorMsg(null);
    setProducts([]); 
    setSelectedProduct(null);
    
    const targetUrl = `https://www.pardo.com.ar/api/catalog_system/pub/products/search?fq=productClusterIds:${id}&_from=0&_to=49`;

    try {
      let vtexProducts = null;
      let lastError = null;

      // Strategies: AllOrigins Raw -> CORSProxy -> AllOrigins Wrapped
      const strategies = [
        { name: 'AllOrigins Raw', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`, parser: (d:any) => d },
        { name: 'CORSProxy', url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, parser: (d:any) => d },
        { name: 'AllOrigins Wrapped', url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, parser: (d:any) => JSON.parse(d.contents) }
      ];

      for (const strat of strategies) {
        if (vtexProducts) break;
        try {
            console.log(`Trying ${strat.name}...`);
            const res = await fetch(strat.url);
            if (res.ok) {
                const data = await res.json();
                const parsed = strat.parser(data);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    vtexProducts = parsed;
                }
            }
        } catch (e) {
            console.warn(`${strat.name} failed:`, e);
            lastError = e;
        }
      }

      if (!vtexProducts) {
        throw new Error("Error de conexión (Proxies agotados).");
      }

      // Map VTEX Data
      const mappedProducts: Product[] = vtexProducts.map((p: any) => {
        const item = p.items[0];
        const seller = item.sellers.find((s: any) => s.sellerId === "1") || item.sellers[0];
        const offer = seller.commertialOffer;

        // Interest Free Logic
        let maxInstallments = 0;
        if (offer.Installments && Array.isArray(offer.Installments)) {
            const zeroInterest = offer.Installments.filter((i: any) => i.InterestRate === 0);
            if (zeroInterest.length > 0) {
                maxInstallments = Math.max(...zeroInterest.map((i: any) => i.NumberOfInstallments));
            } else {
                maxInstallments = Math.max(...offer.Installments.map((i: any) => i.NumberOfInstallments));
            }
        }

        const rawImage = item.images[0]?.imageUrl || '';
        const cleanImage = rawImage.split('?')[0]; 
        const proxyImage = cleanImage ? `https://wsrv.nl/?url=${encodeURIComponent(cleanImage)}&output=jpg&w=1000&h=1000` : '';

        return {
            id: p.productId,
            name: p.productName,
            price: offer.Price,
            listPrice: offer.ListPrice,
            imageUrl: proxyImage,
            installments: maxInstallments,
            freeShipping: offer.Price > 100000, 
            sku: item.itemId,
            pickup: true, // Defaulting to true as many items have free pickup
            bankPromo: '' // Can't detect easily from standard VTEX search API without extended info
        };
      });

      setProducts(mappedProducts);
      if (mappedProducts.length > 0) {
        setSelectedProduct(mappedProducts[0]);
      }

    } catch (e: any) {
      console.error("Fetch Final Error:", e);
      setErrorMsg(e.message || "Error desconocido");
    } finally {
      setLoadingData(false);
    }
  };

  const handleOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
            setCustomOverlay(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Image Generation Logic ---

  const drawProduct = async (product: Product, canvas: HTMLCanvasElement, download = false) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas Setup
    const WIDTH = 1000;
    const HEIGHT = 1000;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    // 1. Background (White)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Layout Config
    // We keep these margins so the product doesn't overlap the header/footer of the overlay
    const frameTop = 130; 
    const frameBottom = 130;
    const safeAreaTop = frameTop;
    const safeAreaHeight = HEIGHT - frameTop - frameBottom;

    // 2. Product Image
    try {
      const img = await loadImage(product.imageUrl);

      // Calculate fit
      const padding = 20; 
      const maxImgH = safeAreaHeight - 140; // Leave room for price at bottom
      const maxImgW = WIDTH - (padding * 2);

      const scale = Math.min(maxImgW / img.width, maxImgH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      
      // Center vertically in the top portion of safe area
      const x = (WIDTH - drawW) / 2;
      let y = safeAreaTop + 40; // Small top padding inside safe area

      if (!showPrice) {
        y += 50; // Offset increased to 50px as requested
      }

      ctx.drawImage(img, x, y, drawW, drawH);

    } catch (e) {
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(100, safeAreaTop, 800, safeAreaHeight);
      ctx.fillStyle = '#ccc';
      ctx.font = '30px Roboto';
      ctx.textAlign = 'center';
      ctx.fillText("Sin Imagen", 500, 500);
    }

    // 3. Badges (Cucardas)
    const badgeY = safeAreaTop + 20;
    let leftBadgeY = badgeY;
    let rightBadgeY = badgeY;

    // --- Bank / Promo Badge (Left) - INDEPENDENT ---
    if (showBankBadge) {
        ctx.fillStyle = COLORS.debitBadge; 
        roundRect(ctx, 30, leftBadgeY, 280, 80, 10);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = '900 36px Roboto'; 
        ctx.textAlign = 'center';
        ctx.fillText("10% OFF", 30 + 140, leftBadgeY + 40);
        
        ctx.font = '400 18px Roboto';
        ctx.fillText("1 PAGO Débito", 30 + 140, leftBadgeY + 65);
        
        leftBadgeY += 90;
    }

    // --- Other Badges (Right) - CONTROLLED BY "Mostrar Cucardas" ---
    if (showBadges) {
        // --- Installments Badge (Right) ---
        if (product.installments > 1) {
             const badgeW = 260;
             const badgeH = 70;
             const badgeX = WIDTH - badgeW - 30;
             
             ctx.fillStyle = COLORS.orangeBadge;
             roundRect(ctx, badgeX, rightBadgeY, badgeW, badgeH, 10);
             ctx.fill();

             ctx.fillStyle = 'white';
             ctx.font = '900 50px Roboto';
             ctx.textAlign = 'left';
             ctx.textBaseline = 'middle';
             ctx.fillText(product.installments.toString(), badgeX + 15, rightBadgeY + (badgeH/2) + 2);
             
             ctx.font = '700 20px Roboto';
             ctx.fillText("SIN", badgeX + 80, rightBadgeY + 25);
             ctx.fillText("INTERÉS", badgeX + 80, rightBadgeY + 48);
             
             rightBadgeY += 80;
        }

        // --- Free Pickup Badge (Right) ---
        if (product.pickup) {
            const badgeW = 260;
            const badgeH = 40;
            const badgeX = WIDTH - badgeW - 30;
            
            ctx.fillStyle = COLORS.pickupBadge;
            roundRect(ctx, badgeX, rightBadgeY, badgeW, badgeH, 20); 
            ctx.fill();
            
            ctx.fillStyle = '#FFFFFF'; // White text
            ctx.font = '700 20px Roboto';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("¡RETIRO GRATIS!", badgeX + (badgeW/2), rightBadgeY + (badgeH/2) + 2);
        }
    }

    // 4. Price
    if (showPrice) {
        const priceY = HEIGHT - frameBottom - 30;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        
        if (product.installments > 1) {
            const installmentVal = product.price / product.installments;
            const instText = `Hasta ${product.installments}x ${formatPrice(installmentVal)} cuotas sin interés`;
            
            ctx.font = '700 32px Roboto';
            
            // White Glow (Stroke)
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 8;
            ctx.strokeText(instText, WIDTH / 2, priceY - 110);
            
            // Text Fill
            ctx.fillStyle = COLORS.orangeBadge;
            ctx.fillText(instText, WIDTH / 2, priceY - 110);
        }

        // Main Price
        ctx.font = '900 110px Roboto';
        
        // White Glow (Stroke)
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 16;
        ctx.strokeText(formatPrice(product.price), WIDTH / 2, priceY);
        
        // Text Fill
        ctx.fillStyle = COLORS.priceColor;
        ctx.fillText(formatPrice(product.price), WIDTH / 2, priceY);
    }

    // 5. Custom Overlay (The Frame)
    // Drawn last to appear on top
    if (customOverlay) {
        try {
            const overlayImg = await loadImage(customOverlay);
            ctx.drawImage(overlayImg, 0, 0, WIDTH, HEIGHT);
        } catch (e) {
            console.error("Error loading overlay", e);
        }
    }

    // 6. Download Trigger
    if (download) {
      const link = document.createElement('a');
      link.download = `pardo_${product.sku}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    }
  };

  // Helper for rounded rects
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Re-draw on changes
  useEffect(() => {
    if (canvasRef.current && selectedProduct) {
      drawProduct(selectedProduct, canvasRef.current);
    }
  }, [selectedProduct, showPrice, showBadges, showBankBadge, customOverlay]);

  // --- Batch Processing ---

  const runBatchProcess = async () => {
    if (!canvasRef.current) return;
    setProcessing(true);
    setGeneratedCount(0);

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      setSelectedProduct(p);
      await new Promise(r => setTimeout(r, 600));
      await drawProduct(p, canvasRef.current, true);
      setGeneratedCount(prev => prev + 1);
      await new Promise(r => setTimeout(r, 500));
    }
    setProcessing(false);
    alert("Proceso finalizado.");
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={24} />
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Generador Pardo</h2>
          </div>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.8rem' }}>Automatización v2.0</p>
        </div>

        {/* Cluster Input Section */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f9fafb' }}>
            <label style={styles.label}>ID Cluster o URL</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                    type="text" 
                    placeholder="Ej: 1970"
                    value={clusterInput}
                    onChange={(e) => setClusterInput(e.target.value)}
                    style={styles.input}
                    onKeyDown={(e) => e.key === 'Enter' && fetchClusterData()}
                />
                <button 
                    style={{...styles.button, padding: '0 1rem', marginBottom: '0.5rem'}}
                    onClick={fetchClusterData}
                    disabled={loadingData}
                >
                    {loadingData ? <RefreshCw className="spin" size={16} /> : <Search size={16} />}
                </button>
            </div>
            {errorMsg && (
                 <div style={{ fontSize: '0.8rem', color: '#d32f2f', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                    <AlertTriangle size={14} /> {errorMsg}
                 </div>
            )}
            <div style={{display:'flex', gap:'5px', marginTop: '10px'}}>
                 <button 
                  onClick={() => { setSelectedProduct(DEMO_PRODUCT); setProducts([DEMO_PRODUCT]); }}
                  style={{...styles.secondaryButton, fontSize: '0.75rem', padding: '5px', width:'100%'}}
                 >
                   Cargar Demo (Imagen Referencia)
                 </button>
            </div>
        </div>
        
        <div style={styles.productList}>
          {products.map(p => (
            <div 
              key={p.id}
              style={{
                ...styles.productItem,
                ...(selectedProduct?.id === p.id ? styles.activeItem : {})
              }}
              onClick={() => setSelectedProduct(p)}
            >
              <img src={p.imageUrl} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', backgroundColor: '#fff', border:'1px solid #eee' }} />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{p.sku} | ${p.price.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ padding: '1rem', borderTop: '1px solid #e0e0e0' }}>
          <button 
            style={{...styles.button, width: '100%', backgroundColor: processing ? '#ccc' : COLORS.pardoBlue}} 
            onClick={runBatchProcess}
            disabled={processing || products.length === 0}
          >
            {processing ? <RefreshCw className="spin" size={20} /> : <Play size={20} />}
            {processing ? `Generando ${generatedCount}/${products.length}...` : 'Procesar Todo Auto'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <div style={{ width: '100%', maxWidth: '1100px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ImageIcon /> Vista Previa
          </h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
             {selectedProduct && (
                <button 
                style={{...styles.button, ...styles.secondaryButton}} 
                onClick={() => drawProduct(selectedProduct, canvasRef.current!, true)}
                >
                <Download size={18} /> Descargar Actual
                </button>
             )}
          </div>
        </div>

        <div style={styles.card}>
          {/* Canvas Preview */}
          <div>
            <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#666' }}>Canvas 1000x1000px Output</div>
            <div style={styles.canvasContainer}>
              <canvas 
                ref={canvasRef} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} /> Personalización
              </h3>
              
              {/* Option 1: General Badges */}
              <div style={styles.badgeOption}>
                   <input type="checkbox" checked={showBadges} onChange={e => setShowBadges(e.target.checked)} />
                   <div style={{flex:1}}>
                      <strong>Cucardas Automáticas</strong>
                      <div style={{fontSize:'0.8rem', color:'#666'}}>Cuotas y Envío Gratis</div>
                   </div>
                   <Layers size={18} color="#666" />
              </div>

              {/* Option 2: Price */}
              <div style={styles.badgeOption}>
                   <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} />
                   <div style={{flex:1}}>
                      <strong>Sobreimprimir Precio</strong>
                      <div style={{fontSize:'0.8rem', color:'#666'}}>Estilo Naranja Pardo</div>
                   </div>
                   <ShoppingBag size={18} color="#666" />
              </div>

              {/* Option 3: Bank Badge (Selectable) */}
              <div style={styles.badgeOption}>
                   <input type="checkbox" checked={showBankBadge} onChange={e => setShowBankBadge(e.target.checked)} />
                   <div style={{flex:1}}>
                      <strong>Promoción Banco</strong>
                      <div style={{fontSize:'0.8rem', color:'#666'}}>10% OFF 1 PAGO DÉBITO</div>
                   </div>
                   <Tag size={18} color="#666" />
              </div>

              <div style={{ marginTop: '1rem', borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                 <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <label style={{...styles.label, marginBottom:0}}>Marco/Overlay</label>
                 </div>
                 <div style={{display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#f0f9ff', padding: '10px', borderRadius: '4px', marginTop:'5px'}}>
                    <FileImage size={16} color={COLORS.pardoBlue} />
                    <input 
                        type="file" 
                        accept="image/png"
                        onChange={handleOverlayUpload}
                        style={styles.fileInput}
                    />
                 </div>
                 <div style={{fontSize:'0.75rem', color:'#666', marginTop:'5px'}}>
                   PNG transparente 1000x1000px.
                 </div>
              </div>
            </div>

            {selectedProduct ? (
                <>
                <div style={{ backgroundColor: '#eef2ff', padding: '1rem', borderRadius: '4px', marginTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: COLORS.pardoBlue }}>Datos del Producto (Live)</h4>
                <div style={{ fontSize: '0.9rem', display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    <div style={{display:'flex', justifyContent:'space-between'}}><strong>SKU:</strong> <span>{selectedProduct.sku}</span></div>
                    <div style={{display:'flex', justifyContent:'space-between'}}><strong>Precio:</strong> <span>{formatPrice(selectedProduct.price)}</span></div>
                    <div style={{display:'flex', justifyContent:'space-between'}}><strong>Cuotas:</strong> <span>{selectedProduct.installments} sin interés</span></div>
                    <div style={{display:'flex', justifyContent:'space-between'}}><strong>Envío:</strong> <span>{selectedProduct.pickup ? 'Retiro Gratis' : 'Normal'}</span></div>
                </div>
                </div>
                </>
            ) : (
                <div style={{ fontStyle: 'italic', color: '#888', marginTop:'1rem' }}>Seleccione un producto.</div>
            )}
          </div>
        </div>
      </div>
      
      {/* CSS for Spinner */}
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);