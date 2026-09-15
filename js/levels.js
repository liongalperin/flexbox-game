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
    title: 'המראה ראשונה: מרכוז',
    instructionHe: 'כוונו את 3 מסוקי הסיור למרכז המנחת לאורך הציר הראשי בעזרת justify-content.',
    instructionEn: 'Guide the 3 scout helicopters to the center of the helipad along the main axis using justify-content.',
    hint: 'הציר הראשי של flex-direction: row הוא האופקי. איזה ערך ממרכז פריטים לאורכו?',
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
      { id: 'heli-1', type: 'scout-blue' },
      { id: 'heli-2', type: 'scout-blue' },
      { id: 'heli-3', type: 'scout-blue' }
    ]
  },
  {
    id: 2,
    title: 'פריסת טייסת',
    instructionHe: 'פזרו את 3 מסוקי הסיור במרווח שווה ביניהם לרוחב המנחת, כך שהחיצוניים ייתקרבו כמה שיותר לדפנות.',
    instructionEn: 'Disperse the 3 patrol helicopters with equal space between them, pushing the outer ones to the edges.',
    hint: 'יש ערך שמצמיד את הפריט הראשון להתחלה, את האחרון לסוף, ומחלק את היתר שווה בשווה.',
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
      { id: 'heli-1', type: 'patrol-green' },
      { id: 'heli-2', type: 'patrol-green' },
      { id: 'heli-3', type: 'patrol-green' }
    ]
  },
  {
    id: 3,
    title: 'נחיתה נמוכה',
    instructionHe: 'הנחיתו את 2 מסוקי המשא בתחתית המנחת לאורך הציר המשני בעזרת align-items.',
    instructionEn: 'Land the 2 cargo helicopters at the bottom of the pad along the cross axis using align-items.',
    hint: 'align-items שולט על הציר המשני. בשורה, הציר המשני הוא האנכי.',
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
      { id: 'heli-1', type: 'cargo-yellow' },
      { id: 'heli-2', type: 'cargo-yellow' }
    ]
  },
  {
    id: 4,
    title: 'מרכז הפיקוד',
    instructionHe: 'כוונו את 2 מסוקי הפיקוד בדיוק למרכז המנחת — הן לאורך הציר הראשי והן לאורך הציר המשני.',
    instructionEn: 'Center the 2 command helicopters in the dead center of the pad, on both the main and cross axes.',
    hint: 'מרכוז מושלם דורש שני מאפיינים יחד — אחד לכל ציר.',
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
      { id: 'heli-1', type: 'command-gold' },
      { id: 'heli-2', type: 'command-gold' }
    ]
  },
  {
    id: 5,
    title: 'סדר הפוך',
    instructionHe: 'הפכו את סדר העמידה של 3 מסוקי היירוט מימין לשמאל באמצעות שינוי כיוון הציר הראשי.',
    instructionEn: 'Reverse the order of the 3 interceptors right-to-left by changing the main axis direction.',
    hint: 'flex-direction יכול גם להפוך את כיוון הזרימה, לא רק להחליף בין שורה לעמודה.',
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
      { id: 'heli-1', type: 'interceptor-blue' },
      { id: 'heli-2', type: 'interceptor-yellow' },
      { id: 'heli-3', type: 'interceptor-pink' }
    ]
  },
  {
    id: 6,
    title: 'מבנה טור',
    instructionHe: 'סדרו את 3 מסוקי הגישוש בעמודה אנכית מלמעלה למטה, עם רווח שווה מסביב לכל מסוק.',
    instructionEn: 'Arrange the 3 recon helicopters in a vertical column, with equal space around each one.',
    hint: 'קודם שנו את הציר לאנכי — ואז שימו לב שיש הבדל בין space-around לבין space-between.',
    requiresMultipleProperties: true,
    usesFlexWrap: false,
    availableProperties: [
      {
        property: 'flex-direction',
        label: 'flex-direction',
        controlType: 'select',
        options: ['row', 'row-reverse', 'column'],
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
      { id: 'heli-1', type: 'recon-cyan' },
      { id: 'heli-2', type: 'recon-cyan' },
      { id: 'heli-3', type: 'recon-cyan' }
    ]
  },
  {
    id: 7,
    title: 'עגינת פינה',
    instructionHe: 'סדרו את 2 הרחפנים בעמודה הפוכה (מלמטה למעלה) והצמידו אותם לדופן הימנית של המנחת.',
    instructionEn: 'Arrange the 2 drones in an inverted column (bottom-to-top) against the right wall of the pad.',
    hint: 'כשהציר הראשי אנכי, align-items מזיז פריטים שמאלה וימינה.',
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
      { id: 'heli-1', type: 'drone-blue' },
      { id: 'heli-2', type: 'drone-yellow' }
    ]
  },
  {
    id: 8,
    title: 'גלישת טייסת',
    instructionHe: 'טייסת של 6 מסוקים אינה נכנסת בשורה אחת! אפשרו גלישה לשורות נוספות ומרכזו אותן.',
    instructionEn: 'A squadron of 6 cannot fit on one line! Allow wrapping onto extra rows and center them.',
    hint: 'flex-wrap פותח שורה נוספת. אחר כך מרכזו כל שורה לאורך הציר הראשי.',
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
      { id: 'heli-1', type: 'gunship-blue' },
      { id: 'heli-2', type: 'gunship-yellow' },
      { id: 'heli-3', type: 'gunship-pink' },
      { id: 'heli-4', type: 'gunship-green' },
      { id: 'heli-5', type: 'gunship-orange' },
      { id: 'heli-6', type: 'gunship-purple' }
    ]
  },
  {
    id: 9,
    title: 'סיפון הפוך',
    instructionHe: 'סדרו את 6 מסוקי הקרב בגלישת שורות הפוכה (מלמטה למעלה), עם מרווח מקסימלי בין המסוקים בכל שורה.',
    instructionEn: 'Wrap the 6 gunships in reverse row order (bottom-to-top), with maximum spacing in each row.',
    hint: 'ל-flex-wrap יש גם ערך שמהפך את סדר השורות. למרווח מקסימלי — הצמידו את הקצוות.',
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
      { id: 'heli-1', type: 'attack-blue' },
      { id: 'heli-2', type: 'attack-yellow' },
      { id: 'heli-3', type: 'attack-pink' },
      { id: 'heli-4', type: 'attack-green' },
      { id: 'heli-5', type: 'attack-orange' },
      { id: 'heli-6', type: 'attack-purple' }
    ]
  },
  {
    id: 10,
    title: 'מסדר המפקדה',
    instructionHe: 'המשימה האחרונה! סדרו את 3 מסוקי הפיקוד בעמודה, במרווחים שווים לחלוטין — גם ביניהם וגם מהקצוות — ומרכזו אותם לרוחב המנחת.',
    instructionEn: 'Final mission! Stack the 3 command helicopters in a column with perfectly equal gaps, including the edges, centred across the pad.',
    hint: 'כשהציר הראשי אנכי, justify-content מפזר לגובה ו-align-items ממקם לרוחב. שימו לב להבדל בין space-around לבין space-evenly — רק באחד מהם גם המרווח מהקצוות שווה.',
    requiresMultipleProperties: true,
    usesFlexWrap: false,
    availableProperties: [
      {
        property: 'flex-direction',
        label: 'flex-direction',
        controlType: 'select',
        options: ['row', 'row-reverse', 'column'],
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
      'justify-content': 'space-evenly',
      'align-items': 'center'
    },
    items: [
      { id: 'heli-1', type: 'hq-gold' },
      { id: 'heli-2', type: 'hq-gold' },
      { id: 'heli-3', type: 'hq-gold' }
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
