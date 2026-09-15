/**
 * AstroDock - Level Definitions
 * Contains level data, instructions, and target solutions for all 10 stages.
 */


function deepFreeze(obj) {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const val = obj[prop];
    if (val && (typeof val === 'object' || typeof val === 'function') && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  });
  return obj;
}

const RAW_LEVELS = [
  {
    id: 1,
    title: 'Main Thrusters: Center',
    instructionHe: 'כוונו את חללית הסיור למרכז רציף הנחיתה לאורך הציר הראשי בעזרת justify-content.',
    instructionEn: 'Guide the scout ship to the center of the docking bay along the main axis using justify-content.',
    hint: 'Use "justify-content: center" to position items in the middle of the main axis.',
    requiresMultipleProperties: false,
    usesFlexWrap: false,
    availableProperties: [
      {
        property: 'justify-content',
        label: 'justify-content',
        controlType: 'select',
        options: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
        defaultValue: 'flex-start'
      }
    ],
    initialContainerStyles: {
      'justify-content': 'flex-start'
    },
    targetContainerStyles: {
      'justify-content': 'center'
    },
    items: [
      { id: 'ship-1', type: 'scout-blue', label: '01' }
    ]
  },
  {
    id: 2,
    title: 'Fleet Separation',
    instructionHe: 'פזרו את 3 חלליות הסיור במרווח שווה ביניהן לרוחב הרציף, כך שהחיצוניות ייצמדו לדפנות.',
    instructionEn: 'Disperse the 3 patrol ships with equal space separating them across the bay, pushing outer ships to the edges.',
    hint: '"space-between" pushes the first and last items to the edges while distributing the rest evenly.',
    requiresMultipleProperties: false,
    usesFlexWrap: false,
    availableProperties: [
      {
        property: 'justify-content',
        label: 'justify-content',
        controlType: 'select',
        options: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
        defaultValue: 'flex-start'
      }
    ],
    initialContainerStyles: {
      'justify-content': 'flex-start'
    },
    targetContainerStyles: {
      'justify-content': 'space-between'
    },
    items: [
      { id: 'ship-1', type: 'patrol-green', label: 'P1' },
      { id: 'ship-2', type: 'patrol-green', label: 'P2' },
      { id: 'ship-3', type: 'patrol-green', label: 'P3' }
    ]
  },
  {
    id: 3,
    title: 'Vertical Alignment',
    instructionHe: 'הנחיתו את 2 ספינות המשא בתחתית הרציף לאורך הציר המשני בעזרת align-items.',
    instructionEn: 'Align the 2 cargo haulers to the bottom floor of the bay along the cross axis using align-items.',
    hint: 'align-items controls positioning on the cross-axis. "flex-end" anchors items to the bottom in a row layout.',
    requiresMultipleProperties: false,
    usesFlexWrap: false,
    availableProperties: [
      {
        property: 'align-items',
        label: 'align-items',
        controlType: 'select',
        options: ['flex-start', 'flex-end', 'center', 'baseline', 'stretch'],
        defaultValue: 'flex-start'
      }
    ],
    initialContainerStyles: {
      'align-items': 'flex-start'
    },
    targetContainerStyles: {
      'align-items': 'flex-end'
    },
    items: [
      { id: 'ship-1', type: 'cargo-yellow', label: 'C1' },
      { id: 'ship-2', type: 'cargo-yellow', label: 'C2' }
    ]
  },
  {
    id: 4,
    title: 'Orbital Centerpoint',
    instructionHe: 'כוונו את ספינת הפיקוד בדיוק למרכז הרציף – הן לאורך הציר הראשי והן לאורך הציר המשני.',
    instructionEn: 'Center the command flagship in the dead center of the bay along both the main and cross axes.',
    hint: 'Combine "justify-content: center" and "align-items: center" for perfect 2D centering.',
    requiresMultipleProperties: true,
    usesFlexWrap: false,
    availableProperties: [
      {
        property: 'justify-content',
        label: 'justify-content',
        controlType: 'select',
        options: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
        defaultValue: 'flex-start'
      },
      {
        property: 'align-items',
        label: 'align-items',
        controlType: 'select',
        options: ['flex-start', 'flex-end', 'center', 'baseline', 'stretch'],
        defaultValue: 'flex-start'
      }
    ],
    initialContainerStyles: {
      'justify-content': 'flex-start',
      'align-items': 'flex-start'
    },
    targetContainerStyles: {
      'justify-content': 'center',
      'align-items': 'center'
    },
    items: [
      { id: 'ship-1', type: 'flagship-gold', label: 'CMD' }
    ]
  },
  {
    id: 5,
    title: 'Inverted Vector',
    instructionHe: 'הפכו את סדר העמידה של 3 המיירטים מימין לשמאל באמצעות שינוי כיוון הציר הראשי.',
    instructionEn: 'Reverse the order of the 3 interceptors from right to left by changing the main axis direction.',
    hint: '"flex-direction: row-reverse" switches the main axis direction from right to left.',
    requiresMultipleProperties: false,
    usesFlexWrap: false,
    availableProperties: [
      {
        property: 'flex-direction',
        label: 'flex-direction',
        controlType: 'select',
        options: ['row', 'row-reverse', 'column', 'column-reverse'],
        defaultValue: 'row'
      }
    ],
    initialContainerStyles: {
      'flex-direction': 'row'
    },
    targetContainerStyles: {
      'flex-direction': 'row-reverse'
    },
    items: [
      { id: 'ship-1', type: 'interceptor-red', label: 'α' },
      { id: 'ship-2', type: 'interceptor-red', label: 'β' },
      { id: 'ship-3', type: 'interceptor-red', label: 'γ' }
    ]
  },
  {
    id: 6,
    title: 'Column Formation',
    instructionHe: 'סדרו את 3 הגשושיות בעמודה אנכית מלמעלה למטה, עם רווח שווה מסביב לכל גשושית.',
    instructionEn: 'Arrange the 3 research probes in a vertical column from top to bottom, with equal space around each probe.',
    hint: 'Set "flex-direction: column", which turns the vertical axis into the main axis, then adjust "justify-content".',
    requiresMultipleProperties: true,
    usesFlexWrap: false,
    availableProperties: [
      {
        property: 'flex-direction',
        label: 'flex-direction',
        controlType: 'select',
        options: ['row', 'row-reverse', 'column', 'column-reverse'],
        defaultValue: 'row'
      },
      {
        property: 'justify-content',
        label: 'justify-content',
        controlType: 'select',
        options: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
        defaultValue: 'flex-start'
      }
    ],
    initialContainerStyles: {
      'flex-direction': 'row',
      'justify-content': 'flex-start'
    },
    targetContainerStyles: {
      'flex-direction': 'column',
      'justify-content': 'space-around'
    },
    items: [
      { id: 'ship-1', type: 'probe-cyan', label: '01' },
      { id: 'ship-2', type: 'probe-cyan', label: '02' },
      { id: 'ship-3', type: 'probe-cyan', label: '03' }
    ]
  },
  {
    id: 7,
    title: 'Corner Docking',
    instructionHe: 'סדרו את 2 הרחפנים בעמודה הפוכה (מלמטה למעלה) והצמידו אותם לדופן הימנית של הרציף.',
    instructionEn: 'Arrange the 2 drone fighters in an inverted column (bottom-to-top) aligned against the right wall of the bay.',
    hint: 'In a column layout, align-items controls the horizontal cross axis. "column-reverse" stacks items upward.',
    requiresMultipleProperties: true,
    usesFlexWrap: false,
    availableProperties: [
      {
        property: 'flex-direction',
        label: 'flex-direction',
        controlType: 'select',
        options: ['row', 'row-reverse', 'column', 'column-reverse'],
        defaultValue: 'row'
      },
      {
        property: 'align-items',
        label: 'align-items',
        controlType: 'select',
        options: ['flex-start', 'flex-end', 'center', 'baseline', 'stretch'],
        defaultValue: 'flex-start'
      }
    ],
    initialContainerStyles: {
      'flex-direction': 'row',
      'align-items': 'flex-start'
    },
    targetContainerStyles: {
      'flex-direction': 'column-reverse',
      'align-items': 'flex-end'
    },
    items: [
      { id: 'ship-1', type: 'drone-purple', label: 'D1' },
      { id: 'ship-2', type: 'drone-purple', label: 'D2' }
    ]
  },
  {
    id: 8,
    title: 'Squadron Hyper-Wrap',
    instructionHe: 'טייסת של 6 חלליות אינה נכנסת בשורה אחת! אפשרו גלישת פריטים לשורות נוספות ומרכזו אותן.',
    instructionEn: 'A squadron of 6 fighters cannot fit on a single line! Allow items to wrap into multiple rows and center them.',
    hint: '"flex-wrap: wrap" allows overflowing flex items to break into multiple rows.',
    requiresMultipleProperties: true,
    usesFlexWrap: true,
    availableProperties: [
      {
        property: 'flex-wrap',
        label: 'flex-wrap',
        controlType: 'select',
        options: ['nowrap', 'wrap', 'wrap-reverse'],
        defaultValue: 'nowrap'
      },
      {
        property: 'justify-content',
        label: 'justify-content',
        controlType: 'select',
        options: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
        defaultValue: 'flex-start'
      }
    ],
    initialContainerStyles: {
      'flex-wrap': 'nowrap',
      'justify-content': 'flex-start'
    },
    targetContainerStyles: {
      'flex-wrap': 'wrap',
      'justify-content': 'center'
    },
    items: [
      { id: 'ship-1', type: 'fighter-orange', label: 'F1' },
      { id: 'ship-2', type: 'fighter-orange', label: 'F2' },
      { id: 'ship-3', type: 'fighter-orange', label: 'F3' },
      { id: 'ship-4', type: 'fighter-orange', label: 'F4' },
      { id: 'ship-5', type: 'fighter-orange', label: 'F5' },
      { id: 'ship-6', type: 'fighter-orange', label: 'F6' }
    ]
  },
  {
    id: 9,
    title: 'Inverted Multi-Deck',
    instructionHe: 'סדרו את 6 הסיירות בגלישת שורות הפוכה (מלמטה למעלה), עם מרווח מקסימלי בין הספינות בכל שורה.',
    instructionEn: 'Arrange the 6 cruisers to wrap in reverse row order (bottom-to-top), with maximum spacing between ships in each row.',
    hint: '"wrap-reverse" creates rows starting from the bottom upward.',
    requiresMultipleProperties: true,
    usesFlexWrap: true,
    availableProperties: [
      {
        property: 'flex-wrap',
        label: 'flex-wrap',
        controlType: 'select',
        options: ['nowrap', 'wrap', 'wrap-reverse'],
        defaultValue: 'nowrap'
      },
      {
        property: 'justify-content',
        label: 'justify-content',
        controlType: 'select',
        options: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
        defaultValue: 'flex-start'
      }
    ],
    initialContainerStyles: {
      'flex-wrap': 'nowrap',
      'justify-content': 'flex-start'
    },
    targetContainerStyles: {
      'flex-wrap': 'wrap-reverse',
      'justify-content': 'space-between'
    },
    items: [
      { id: 'ship-1', type: 'cruiser-blue', label: 'K1' },
      { id: 'ship-2', type: 'cruiser-blue', label: 'K2' },
      { id: 'ship-3', type: 'cruiser-blue', label: 'K3' },
      { id: 'ship-4', type: 'cruiser-blue', label: 'K4' },
      { id: 'ship-5', type: 'cruiser-blue', label: 'K5' },
      { id: 'ship-6', type: 'cruiser-blue', label: 'K6' }
    ]
  },
  {
    id: 10,
    title: 'Grand Fleet Admiral',
    instructionHe: 'המשימה האחרונה! סדרו את 3 ספינות הדגל בעמודה, פזרו אותן מקצה לקצה לאורך העמודה ומרכזו אותן לרוחב הרציף.',
    instructionEn: 'The ultimate fleet deployment! Arrange the 3 capital flagships in a column, spread them from end to end along the column, and center them across the bay.',
    hint: 'Combine "flex-direction: column", "justify-content: space-between", and "align-items: center".',
    requiresMultipleProperties: true,
    usesFlexWrap: false,
    availableProperties: [
      {
        property: 'flex-direction',
        label: 'flex-direction',
        controlType: 'select',
        options: ['row', 'row-reverse', 'column', 'column-reverse'],
        defaultValue: 'row'
      },
      {
        property: 'justify-content',
        label: 'justify-content',
        controlType: 'select',
        options: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
        defaultValue: 'flex-start'
      },
      {
        property: 'align-items',
        label: 'align-items',
        controlType: 'select',
        options: ['flex-start', 'flex-end', 'center', 'baseline', 'stretch'],
        defaultValue: 'flex-start'
      }
    ],
    initialContainerStyles: {
      'flex-direction': 'row',
      'justify-content': 'flex-start',
      'align-items': 'flex-start'
    },
    targetContainerStyles: {
      'flex-direction': 'column',
      'justify-content': 'space-between',
      'align-items': 'center'
    },
    items: [
      { id: 'ship-1', type: 'admiral-star', label: '★1' },
      { id: 'ship-2', type: 'admiral-star', label: '★2' },
      { id: 'ship-3', type: 'admiral-star', label: '★3' }
    ]
  }
];

// Freeze level objects to prevent accidental mutations
const LEVELS = deepFreeze(RAW_LEVELS);

// Dual export for ESM and global script tag
if (typeof window !== 'undefined') {
  window.AstroDockLevels = LEVELS;
}

export { LEVELS, deepFreeze };
