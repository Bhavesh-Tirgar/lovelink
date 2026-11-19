/**
 * LoveLink Libmoji & Friendmoji Engine
 * Connects directly to Bitmoji CDN for official 2-person couple comic renders
 */

// Known official Friendmoji couple templates (two avatars rendered into one scene)
export const FRIENDMOJI_TEMPLATES = {
  couch: {
    id: 'couch',
    name: 'Couch Cuddle',
    comicId: '10223785',
    emoji: '🛋️',
    description: 'Chilling together on the sofa',
    fallbackUrl: '/assets/avatars/snap_couple_hd.png'
  },
  hug: {
    id: 'hug',
    name: 'Warm Hug',
    comicId: '10223784',
    emoji: '🫂',
    description: 'Close, loving embrace',
    fallbackUrl: '/assets/avatars/snap_couple_hd.png'
  },
  kiss: {
    id: 'kiss',
    name: 'Sweet Kiss',
    comicId: '10223790',
    emoji: '💋',
    description: 'Gentle forehead & lip kiss',
    fallbackUrl: '/assets/avatars/snap_couple_hd.png'
  },
  toast: {
    id: 'toast',
    name: 'Coffee Toast',
    comicId: '10223786',
    emoji: '☕',
    description: 'Morning coffee & good vibes',
    fallbackUrl: '/assets/avatars/snap_couple_hd.png'
  },
  hand_hold: {
    id: 'hand_hold',
    name: 'Holding Hands',
    comicId: '10223787',
    emoji: '🤝',
    description: 'Walking hand in hand forever',
    fallbackUrl: '/assets/avatars/snap_couple_hd.png'
  },
  spoon: {
    id: 'spoon',
    name: 'Bed Spoon',
    comicId: '10223788',
    emoji: '🛌',
    description: 'Cozy good night cuddle in bed',
    fallbackUrl: '/assets/avatars/snap_couple_hd.png'
  },
  high_five: {
    id: 'high_five',
    name: 'High-Five',
    comicId: '10223789',
    emoji: '✋',
    description: 'Playful partner celebration',
    fallbackUrl: '/assets/avatars/snap_couple_hd.png'
  }
};

// Curated Wardrobe Outfits & Clothes for Avatars
export const WARDROBE_OUTFITS = [
  {
    id: 'varsity_jacket',
    name: 'College Varsity & Denim',
    category: 'Casual',
    emoji: '🧥',
    previewColor: 'from-amber-600 to-amber-950',
    description: 'Classic embroidered varsity jacket with relaxed street denim',
    accentColor: '#F59E0B'
  },
  {
    id: 'date_night_velvet',
    name: 'Rose-Gold Velvet & Tuxedo',
    category: 'Date Night',
    emoji: '✨',
    previewColor: 'from-rose-600 to-rose-950',
    description: 'Midnight black velvet suit & shimmering rose-gold cocktail gown',
    accentColor: '#F43F5E'
  },
  {
    id: 'silk_sleepwear',
    name: 'Midnight Silk Pajamas',
    category: 'Sleepwear',
    emoji: '🛌',
    previewColor: 'from-indigo-600 to-indigo-950',
    description: 'Matching satin pajama set with plush cozy slippers',
    accentColor: '#6366F1'
  },
  {
    id: 'traditional_royal',
    name: 'Royal Silk Kurta & Lehenga',
    category: 'Festive',
    emoji: '🥻',
    previewColor: 'from-red-600 via-amber-600 to-yellow-950',
    description: 'Royal zari silk kurta & pastel embroidered celebratory lehenga',
    accentColor: '#E11D48'
  },
  {
    id: 'summer_resort',
    name: 'Breezy Linen & Floral Sundress',
    category: 'Vacation',
    emoji: '🏖️',
    previewColor: 'from-teal-600 to-cyan-950',
    description: 'Crisp white resort linen shirt with pastel floral summer dress',
    accentColor: '#0D9488'
  },
  {
    id: 'obsidian_cyber',
    name: 'Dark Luxury Obsidian Stealth',
    category: 'Signature',
    emoji: '🖤',
    previewColor: 'from-zinc-700 to-black',
    description: 'Ultra-clean matte black cyber coat & fitted minimalist streetwear',
    accentColor: '#71717A'
  }
];

/**
 * Builds the official Bitmoji / Friendmoji CDN URL
 * If custom avatar IDs exist, uses live dynamic comic rendering.
 * Otherwise, falls back to the curated high-res couple artwork.
 */
export function getFriendmojiUrl(action = 'couch', myAvatarId = null, partnerAvatarId = null) {
  const template = FRIENDMOJI_TEMPLATES[action] || FRIENDMOJI_TEMPLATES.couch;
  
  if (myAvatarId && partnerAvatarId) {
    // Official Bitmoji 2-avatar comic URL format
    const cleanId1 = encodeURIComponent(myAvatarId.trim());
    const cleanId2 = encodeURIComponent(partnerAvatarId.trim());
    return `https://render.bitstrips.com/render/${template.comicId}/${cleanId1}-%231-${cleanId2}-%231-v1.png?transparent=1&scale=2`;
  }
  
  if (myAvatarId) {
    const cleanId = encodeURIComponent(myAvatarId.trim());
    return `https://render.bitstrips.com/render/${template.comicId}/${cleanId}-v1.png?transparent=1&scale=2`;
  }

  return template.fallbackUrl;
}
