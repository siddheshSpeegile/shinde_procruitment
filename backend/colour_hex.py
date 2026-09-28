"""Best-effort colour name -> hex code matching.

shinde_shoes."DimColour" only has colour NAMES (often abbreviated, e.g.
"BLK/GRN", "WH/PINK", "L GREY"), but the app's color table needs a hex_code
to draw the colour swatch. guess_hex() turns a name into a hex code where it
can, and returns None where it can't (e.g. "ASST", "MULTI") - the Add
Variant screen then asks the user to pick the colour once instead.

Only ONE hex code is returned per name (color.hex_code is VARCHAR(7)), so a
two-colour name like "BLK/GRN" gets its first/main colour.
"""
import re

# Full colour names -> hex. Multi-word names are listed whole so they win
# over their individual words ("SEA GREEN" is not just "GREEN").
COLOURS = {
    'BLACK': '#000000', 'WHITE': '#FFFFFF', 'OFF WHITE': '#F5F2E8',
    'GREY': '#808080', 'SILVER': '#C0C0C0', 'G METAL': '#2A3439',
    'RED': '#D32F2F', 'MAROON': '#800000', 'WINE': '#722F37',
    'BURGUNDY': '#800020', 'CHERRY': '#D2042D', 'RUST': '#B7410E',
    'BLUE': '#1E4FC2', 'NAVY': '#000080', 'NAVY BLUE': '#000080',
    'SKY': '#87CEEB', 'SKY BLUE': '#87CEEB', 'SKYBLUE': '#87CEEB',
    'LIGHT BLUE': '#ADD8E6', 'R BLUE': '#4169E1', 'T BLUE': '#367588',
    'DENIM': '#1560BD', 'BLUE BERRY': '#4F86F7', 'AQUA': '#00B5CC',
    'FIROZI': '#30D5C8', 'TEAL': '#008080',
    'GREEN': '#2E7D32', 'DARK GREEN': '#006400', 'SEA GREEN': '#2E8B57',
    'OLIVE': '#808000', 'SAGE': '#9CAF88', 'MINT': '#98FF98',
    'PISTA': '#93C572', 'MEHANDI': '#6B6B2A', 'LEMON': '#FFF44F',
    'YELLOW': '#FFD600', 'MUSTARD': '#E1AD01', 'SUNFLOWER': '#FFC512',
    'GOLD': '#D4AF37', 'GOLDEN': '#D4AF37', 'L GOLD': '#E6C87A',
    'A GOLD': '#C9A544', 'ROSE GOLD': '#B76E79', 'R GOLD': '#B76E79',
    'BRONZE': '#CD7F32', 'COPPER': '#B87333', 'CHAMP': '#F7E7CE',
    'ORANGE': '#F57C00', 'PEACH': '#FFCBA4', 'CORAL': '#FF7F50',
    'PINK': '#F48FB1', 'F PINK': '#FF4FA3', 'RANI': '#E0115F',
    'MAGENTA': '#FF00FF', 'ROSE': '#E8A0B0', 'R ROSE': '#C21E56',
    'ONION': '#D8A7B1', 'BLOSSOM': '#F9C5D1', 'COTTON CANDY': '#FFBCD9',
    'PURPLE': '#7B1FA2', 'VIOLET': '#7F00FF', 'LAVENDER': '#B57EDC',
    'LILAC': '#C8A2C8', 'MAUVE': '#E0B0FF', 'PLUM': '#8E4585',
    'BROWN': '#6D4C41', 'TAN': '#D2B48C', 'CAMEL': '#C19A6B',
    'CHOCO': '#5C3317', 'COFFEE': '#6F4E37', 'MOCHA': '#967969',
    'LATTE': '#C5A582', 'CHIKOO': '#A0785A', 'TAUPE': '#483C32',
    'KHAKI': '#C3B091', 'BEIGE': '#E8D9B5', 'CREAM': '#FFFDD0',
    'IVORY': '#FFFFF0', 'WHEAT': '#F5DEB3', 'NUDE': '#E3BC9A',
    'SKIN': '#E3BC9A', 'NATURAL': '#E8DCC4', 'NEUTRAL': '#D6CFC7',
    'MOUSE': '#7E7B77', 'NEON': '#39FF14', 'BUTTER': '#FFF1B5',
}

# Abbreviations/misspellings used in DimColour -> the key in COLOURS.
ALIASES = {
    'BLK': 'BLACK', 'BK': 'BLACK', 'WH': 'WHITE', 'WHT': 'WHITE',
    'GRY': 'GREY', 'GRE': 'GREY', 'GR': 'GREY', 'GRAY': 'GREY', 'BLU': 'BLUE',
    'NVY': 'NAVY', 'GRN': 'GREEN', 'C GRN': 'GREEN', 'OLV': 'OLIVE',
    'ORNG': 'ORANGE', 'ORG': 'ORANGE', 'YLW': 'YELLOW', 'PRPL': 'PURPLE',
    'VOILET': 'VIOLET', 'BRN': 'BROWN', 'GLD': 'GOLD', 'SIL': 'SILVER',
    'BG': 'BEIGE', 'BEG': 'BEIGE', 'BEIG': 'BEIGE', 'PECH': 'PEACH',
    'CREME': 'CREAM', 'CREAME': 'CREAM', 'CREM': 'CREAM',
    'COP': 'COPPER', 'COPER': 'COPPER', 'KHAKHI': 'KHAKI', 'LIM': 'LEMON',
    'AGOLD': 'A GOLD', 'RGOLD': 'R GOLD', 'SEAGREEN': 'SEA GREEN',
    'WHITEGREY': 'WHITE', 'WHNAVY': 'WHITE',
}

# Words that change lightness, and words that are just descriptive noise.
DARKER = {'DARK', 'D'}
LIGHTER = {'LIGHT', 'L', 'SOFT'}
NOISE = {'ALL', 'BASIC', 'DOMINO'}


def _lookup(key):
    key = ALIASES.get(key, key)
    return COLOURS.get(key)


def _shade(hex_code, factor):
    """factor < 0 darkens, > 0 lightens (towards white)."""
    r, g, b = (int(hex_code[i:i + 2], 16) for i in (1, 3, 5))
    if factor < 0:
        r, g, b = (int(c * (1 + factor)) for c in (r, g, b))
    else:
        r, g, b = (int(c + (255 - c) * factor) for c in (r, g, b))
    return f"#{r:02X}{g:02X}{b:02X}"


def _match_part(part):
    """Match one colour (no '/'), e.g. 'L GREY', 'DARK BRN', 'SAGE(OLV)'."""
    # "BUTTER(BEIG)", "SAGE(OLV)": try the main name, then the bracketed one
    bracketed = re.findall(r'\(([^)]*)\)', part)
    part = re.sub(r'\([^)]*\)', ' ', part)
    words = [w for w in re.split(r'[\s.\-]+', part) if w]
    candidates = [words] + [[w for w in re.split(r'[\s.\-]+', b) if w] for b in bracketed]

    for words in candidates:
        if not words:
            continue
        hex_code = _lookup(' '.join(words))            # "SEA GREEN", "R GOLD", "F PINK"
        if hex_code:
            return hex_code
        shade = 0
        core = []
        for w in words:
            if w in DARKER:
                shade = -0.35
            elif w in LIGHTER:
                shade = 0.45
            elif w not in NOISE:
                core.append(w)
        if not core:
            continue
        hex_code = _lookup(' '.join(core))
        if not hex_code:
            # Several colour words without a '/' ("WH BK", "GRE BLU"): the
            # first one is the main colour, same as with "BLK/GRN".
            for w in core:
                hex_code = _lookup(w)
                if hex_code:
                    break
        if hex_code:
            return _shade(hex_code, shade) if shade else hex_code
    return None


def guess_hex(name):
    """Hex code for a colour name like 'BLK/GRN', or None if unknown."""
    if not name:
        return None
    text = name.upper()
    text = re.sub(r'\bNO\s*USE\b', ' ', text).strip()
    # "A/GOLD" is one colour (antique gold) - a single-letter prefix before
    # the '/' isn't a colour of its own
    text = re.sub(r'^([A-Z])\s*/\s*', r'\1 ', text)
    if not text:
        return None
    # Two-colour names: "BLK/GRN" -> first colour is the main one
    for part in text.split('/'):
        part = part.strip()
        if part:
            return _match_part(part)
    return None
