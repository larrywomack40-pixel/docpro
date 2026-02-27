const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── ADMIN GUARD ──
const ADMIN_EMAILS = ['larrywomack40@gmail.com'];

// ── 20 DESIGN STYLES ──
const STYLES = [
  // 8 FREE styles
  { id:'executive-gold',   name:'Executive Gold',      tier:'free',     primary:'#C99532', secondary:'#1B3A5C', accent:'#E8D5A3', headingFont:'Playfair Display', bodyFont:'DM Sans', mood:'Prestigious and authoritative' },
  { id:'minimal-clean',    name:'Minimal Clean',       tier:'free',     primary:'#2D2D2D', secondary:'#FAFAFA', accent:'#E0E0E0', headingFont:'Inter',            bodyFont:'Inter',   mood:'Clean and modern' },
  { id:'corporate-bold',   name:'Corporate Bold',      tier:'free',     primary:'#1A237E', secondary:'#FFFFFF', accent:'#FF6F00', headingFont:'Montserrat',       bodyFont:'Open Sans', mood:'Professional and confident' },
  { id:'classic-traditional', name:'Classic Traditional', tier:'free',  primary:'#1B1B1B', secondary:'#F5F0E8', accent:'#8B0000', headingFont:'Merriweather',     bodyFont:'Source Serif Pro', mood:'Timeless and trustworthy' },
  { id:'geometric-art',    name:'Geometric Art',       tier:'free',     primary:'#6200EA', secondary:'#FFFFFF', accent:'#00BFA5', headingFont:'Poppins',          bodyFont:'Roboto',  mood:'Creative and structured' },
  { id:'watercolor',       name:'Watercolor',          tier:'free',     primary:'#5C6BC0', secondary:'#FFF8E1', accent:'#E91E63', headingFont:'Dancing Script',   bodyFont:'Lora',    mood:'Artistic and warm' },
  { id:'dark-professional', name:'Dark Professional',  tier:'free',     primary:'#90CAF9', secondary:'#121212', accent:'#FFC107', headingFont:'Raleway',          bodyFont:'Nunito',  mood:'Sleek and premium' },
  { id:'magazine',         name:'Magazine',            tier:'free',     primary:'#D50000', secondary:'#FFFFFF', accent:'#212121', headingFont:'Oswald',           bodyFont:'Lato',    mood:'Bold editorial style' },
  // 7 PRO styles
  { id:'modern-stripe',    name:'Modern Stripe',       tier:'pro',      primary:'#635BFF', secondary:'#F6F9FC', accent:'#00D4AA', headingFont:'Inter',            bodyFont:'Inter',   mood:'Tech-forward and clean' },
  { id:'creative-studio',  name:'Creative Studio',     tier:'pro',      primary:'#FF4081', secondary:'#FAFAFA', accent:'#7C4DFF', headingFont:'Abril Fatface',    bodyFont:'Work Sans', mood:'Vibrant and expressive' },
  { id:'fresh-green',      name:'Fresh Green',         tier:'pro',      primary:'#2E7D32', secondary:'#F1F8E9', accent:'#FFC107', headingFont:'Quicksand',        bodyFont:'Nunito Sans', mood:'Natural and eco-friendly' },
  { id:'warm-terracotta',  name:'Warm Terracotta',     tier:'pro',      primary:'#BF360C', secondary:'#FFF3E0', accent:'#5D4037', headingFont:'Playfair Display', bodyFont:'Karla',   mood:'Warm and artisan' },
  { id:'tech-startup',     name:'Tech Startup',        tier:'pro',      primary:'#00B8D4', secondary:'#ECEFF1', accent:'#651FFF', headingFont:'Space Grotesk',    bodyFont:'IBM Plex Sans', mood:'Innovative and fresh' },
  { id:'retro-vintage',    name:'Retro Vintage',       tier:'pro',      primary:'#4E342E', secondary:'#EFEBE9', accent:'#FF8F00', headingFont:'Bitter',           bodyFont:'Josefin Sans', mood:'Nostalgic craftsmanship' },
  { id:'royal-crest',      name:'Royal Crest',         tier:'pro',      primary:'#1A237E', secondary:'#E8EAF6', accent:'#FFD700', headingFont:'Cormorant Garamond', bodyFont:'Nunito', mood:'Regal and prestigious' },
  // 5 BUSINESS styles
  { id:'luxury-black',     name:'Luxury Black',        tier:'business', primary:'#FFD700', secondary:'#0A0A0A', accent:'#B0B0B0', headingFont:'Didot',            bodyFont:'Helvetica Neue', mood:'Ultra-premium and exclusive' },
  { id:'neon-gradient',    name:'Neon Gradient',       tier:'business', primary:'#FF6EC7', secondary:'#0F0C29', accent:'#00F5FF', headingFont:'Exo 2',            bodyFont:'Rubik',   mood:'Futuristic and bold' },
  { id:'blueprint',        name:'Blueprint',           tier:'business', primary:'#FFFFFF', secondary:'#1565C0', accent:'#90CAF9', headingFont:'Roboto Mono',      bodyFont:'Roboto',  mood:'Technical and precise' },
  { id:'swiss-design',     name:'Swiss Design',        tier:'business', primary:'#D50000', secondary:'#FFFFFF', accent:'#212121', headingFont:'Helvetica Neue',   bodyFont:'Helvetica Neue', mood:'Grid-perfect minimalism' },
  { id:'japanese-zen',     name:'Japanese Zen',        tier:'business', primary:'#2D2D2D', secondary:'#FAF8F5', accent:'#C62828', headingFont:'Noto Serif JP',    bodyFont:'Noto Sans JP', mood:'Serene and balanced' }
];

// ── 12 DOCUMENT TYPES with minimum tier ──
const DOC_TYPES = [
  { id:'invoice',        name:'Invoice',         minTier:'free' },
  { id:'estimate',       name:'Estimate',        minTier:'free' },
  { id:'receipt',        name:'Receipt',         minTier:'free' },
  { id:'letter',         name:'Letter',          minTier:'free' },
  { id:'resume',         name:'Resume',          minTier:'free' },
  { id:'form',           name:'Form',            minTier:'free' },
  { id:'report',         name:'Report',          minTier:'free' },
  { id:'contract',       name:'Contract',        minTier:'pro' },
  { id:'nda',            name:'NDA',             minTier:'pro' },
  { id:'proposal',       name:'Proposal',        minTier:'pro' },
  { id:'purchase_order', name:'Purchase Order',  minTier:'pro' },
  { id:'pay_stub',       name:'Pay Stub',        minTier:'business' }
];

// ── 42 INDUSTRIES ──
const INDUSTRIES = [
  'general','blank','consulting','accounting','legal','marketing-agency',
  'architecture','engineering','financial-advisory','insurance',
  'medical-practice','dental','pharmacy','mental-health','veterinary','home-health',
  'software','saas','it-services','cybersecurity','web-development',
  'construction','plumbing','electrical','hvac','landscaping','cleaning','auto-repair','handyman',
  'photography','graphic-design','video-production','interior-design','event-planning',
  'restaurant','retail','ecommerce','catering',
  'real-estate','property-management',
  'education','nonprofit','church','fitness'
];

// Business-only regulated industries
const BUSINESS_ONLY_INDUSTRIES = ['medical-practice','dental','pharmacy','mental-health','veterinary','home-health','financial-advisory','insurance','cybersecurity'];

// Tier hierarchy
const TIER_RANK = { free: 0, pro: 1, business: 2 };

function getTier(style, docType, industry) {
  // Pay stubs are ALWAYS business
  if (docType.id === 'pay_stub') return 'business';
  // Business-only combos
  if (BUSINESS_ONLY_INDUSTRIES.includes(industry) && ['contract','nda','pay_stub'].includes(docType.id)) return 'business';
  // Take the highest tier among style tier, doc min tier
  const styleTierRank = TIER_RANK[style.tier] || 0;
  const docTierRank = TIER_RANK[docType.minTier] || 0;
  const maxRank = Math.max(styleTierRank, docTierRank);
  if (maxRank === 2) return 'business';
  if (maxRank === 1) return 'pro';
  return 'free';
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function titleCase(str) {
  return str.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function generateTemplates() {
  const templates = [];
  let sortOrder = 0;

  for (const style of STYLES) {
    for (const docType of DOC_TYPES) {
      for (const industry of INDUSTRIES) {
        const tier = getTier(style, docType, industry);
        const industryName = industry === 'blank' ? '' : titleCase(industry);
        const name = industryName
          ? `${industryName} ${docType.name} - ${style.name}`
          : `${docType.name} - ${style.name}`;
        const slug = slugify(`${docType.id}-${style.id}-${industry}`);
        const category = docType.id;

        templates.push({
          name,
          slug,
          category,
          tier,
          style_id: style.id,
          style_name: style.name,
          industry,
          document_type: docType.id,
          primary_color: style.primary,
          secondary_color: style.secondary,
          accent_color: style.accent,
          heading_font: style.headingFont,
          body_font: style.bodyFont,
          mood: style.mood,
          is_active: true,
          sort_order: sortOrder++,
          fields: JSON.stringify({ sections: [] })
        });
      }
    }
  }
  return templates;
}

module.exports = async function handler(req, res) {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Admin guard via secret or auth
  const authKey = req.headers['x-admin-key'] || req.query.key;
  if (authKey !== process.env.ADMIN_SECRET_KEY) {
    // Also check Supabase auth
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user || !ADMIN_EMAILS.includes(user.email)) {
        return res.status(403).json({ error: 'Forbidden: Admin only' });
      }
    } else {
      return res.status(403).json({ error: 'Forbidden: Admin only. Provide x-admin-key header or Bearer token.' });
    }
  }

  try {
    const templates = generateTemplates();
    const total = templates.length;

    // First, delete all existing templates
    const { error: deleteError } = await supabase.from('templates').delete().neq('id', 0);
    if (deleteError) {
      return res.status(500).json({ error: 'Failed to clear old templates', detail: deleteError.message });
    }

    // Insert in batches of 500
    const BATCH_SIZE = 500;
    let inserted = 0;
    const errors = [];

    for (let i = 0; i < templates.length; i += BATCH_SIZE) {
      const batch = templates.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from('templates').insert(batch);
      if (insertError) {
        errors.push({ batch: Math.floor(i / BATCH_SIZE), error: insertError.message });
      } else {
        inserted += batch.length;
      }
    }

    return res.status(200).json({
      success: true,
      total_generated: total,
      inserted,
      errors: errors.length > 0 ? errors : undefined,
      breakdown: {
        styles: STYLES.length,
        doc_types: DOC_TYPES.length,
        industries: INDUSTRIES.length,
        expected: STYLES.length * DOC_TYPES.length * INDUSTRIES.length
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
