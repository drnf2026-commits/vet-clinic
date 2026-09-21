// قاعدة البيانات الافتراضية المحدثة لعيادة الدواجن المفتوحة
// تدعم دليل أسماء الأدوية، مكاتب الأدوية، المربين ذوي المزارع المتعددة والتحصينات المحددة.

// دليل وأسماء الأدوية المعتمدة بالمعمل
const MOCK_MEDICINES = [
  { id: "med_1", name: "بان فلور (Panflor)", notes: "مضاد حيوي تنفسي ومعوي حاد (فلورفينيكول)" },
  { id: "med_2", name: "أمبروليوم 20%", notes: "علاج كوكسيديا الأمعاء والنزيف المعوي" },
  { id: "med_3", name: "تايلوكير (Tylocare)", notes: "مضاد حيوي تنفسي للطيور والمايكوبلازما" },
  { id: "med_4", name: "دوكسي سيكلين 20%", notes: "مضاد تنفسي للمايكوبلازما" },
  { id: "med_5", name: "كولستين بلس", notes: "مضاد معوي فعال للسموم البكتيرية" },
  { id: "med_6", name: "فيتامين ك3 مائي", notes: "موقف للنزيف المعوي الناتج عن الكوكسيديا" },
  { id: "med_7", name: "فيتامين أد3هـ مستورد", notes: "رافع مناعة ومنشط عام للنمو" },
  { id: "med_8", name: "نيومايسين بيطري", notes: "علاج معوي فعال للإسهالات البيضاء" },
  { id: "med_9", name: "سيفوتاكس بيطري", notes: "مضاد حيوي واسع المدى للحقن" },
  { id: "med_10", name: "مضاد سموم فورت", notes: "غسيل كلى ومضاد سموم فطرية" },
  { id: "med_11", name: "أموكسي سيللين 50%", notes: "مضاد حيوي واسع المدى للبكتيريا المعوية والتنفسية" },
  { id: "med_12", name: "إنروفلوكساسين 10%", notes: "مضاد معوي وتنفسي قوي للقولون والميكوبلازما" },
  { id: "med_13", name: "تولكوزوريل 2.5%", notes: "مضاد كوكسيديا قوي للجرعات الفورية" },
  { id: "med_14", name: "منشط كبد وغسيل كلى", notes: "لتنشيط وظائف الكبد وتصريف الأملاح والسموم" },
  { id: "med_15", name: "فيتامين هـ + سيلينيوم", notes: "لرفع الخصوبة والمناعة وعلاج التواء الرقبة" }
];

const MOCK_PHARMACIES = [
  {
    id: "pharmacy_1",
    name: "مكتب الشرقية البيطري",
    manager: "د. هاني شاكر",
    phone: "01099887766",
    address: "الزقازيق، الشرقية",
    inventory: [
      { tradeName: "بان فلور (Panflor)", activeIngredient: "فلورفينيكول (Florfenicol)", concentration: "10%", use: "مضاد حيوي تنفسي ومعوي حاد" },
      { tradeName: "دوكسي سيكلين 20%", activeIngredient: "دوكسي سيكلين (Doxycycline)", concentration: "20%", use: "مضاد تنفسي للمايكوبلازما" },
      { tradeName: "كولستين بلس", activeIngredient: "كولستين كبريتات (Colistin)", concentration: "5 M.I.U", use: "مضاد معوي فعال للسموم البكتيرية" },
      { tradeName: "فيتامين أد3هـ مستورد", activeIngredient: "فيتامين أد3هـ (Vitamin AD3E)", concentration: "15%", use: "رافع مناعة ومنشط عام للنمو" }
    ]
  },
  {
    id: "pharmacy_2",
    name: "صيدلية الدلتا البيطرية",
    manager: "د. أحمد جلال",
    phone: "01287654321",
    address: "ميت غمر، الدقهلية",
    inventory: [
      { tradeName: "أمبروليوم 20%", activeIngredient: "أمبروليوم (Amprolium)", concentration: "20%", use: "علاج كوكسيديا الأمعاء والنزيف المعوي" },
      { tradeName: "تايلوكير (Tylocare)", activeIngredient: "تايلوزين تارتارات (Tylosin)", concentration: "100%", use: "مضاد حيوي تنفسي للطيور والمايكوبلازما" },
      { tradeName: "فيتامين ك3 مائي", activeIngredient: "فيتامين ك3 (Vitamin K3)", concentration: "10%", use: "موقف للنزيف المعوي الناتج عن الكوكسيديا" },
      { tradeName: "سيفوتاكس بيطري", activeIngredient: "سيفوتاكسيم صوديوم (Cefotaxime)", concentration: "1 جرام", use: "مضاد حيوي واسع المدى للحقن" }
    ]
  },
  {
    id: "pharmacy_3",
    name: "مكتب المنوفية للدواجن",
    manager: "المهندس سامح علام",
    phone: "01122334455",
    address: "الباجور، المنوفية",
    inventory: [
      { tradeName: "فلوريكول 10%", activeIngredient: "فلورفينيكول (Florfenicol)", concentration: "10%", use: "مضاد تنفسي ومعوي للقولون" },
      { tradeName: "نيومايسين بيطري", activeIngredient: "نيومايسين كبريتات (Neomycin)", concentration: "50%", use: "علاج معوي فعال للإسهالات البيضاء" },
      { tradeName: "مضاد سموم فورت", activeIngredient: "مضاد سموم بيولوجي (Antitoxin)", concentration: "25%", use: "غسيل كلى ومضاد سموم فطرية" }
    ]
  }
];

const MOCK_DATA = [
  {
    id: "breeder_1",
    name: "الحاج أحمد أبو العلا",
    phone: "01012345678",
    address: "ميت غمر، الدقهلية",
    preferredPharmacyId: "pharmacy_2",
    financialStatus: {
      hasDebt: true,
      debtAmount: 2500,
      notes: "متبقي كشف نيوكاسل سابق للدورة الحالية"
    },
    farms: [
      {
        id: "farm_1_1",
        name: "عنبر 1 - تسمين علوي",
        type: "تسمين",
        breed: "روس 308 (Ross 308)",
        hatchery: "شركة الوادي للدواجن",
        capacity: 10000,
        status: "نشط",
        vaccinations: [
          { name: "هيتشنر تنقيط + برونشيت", age: "7 أيام", date: "2026-07-02", status: "تمت" },
          { name: "جمبورو عمر 12 يوم", age: "12 يوم", date: "2026-07-07", status: "تمت" },
          { name: "كلون 30 للنيوكاسل", age: "18 يوم", date: "2026-07-13", status: "معلقة" }
        ]
      },
      {
        id: "farm_1_2",
        name: "عنبر 2 - بياض أرضي",
        type: "بياض",
        breed: "لوهمان براون",
        hatchery: "مفرخات الدلتا",
        capacity: 5000,
        status: "نشط",
        vaccinations: [
          { name: "حقن ثنائي زيتي عمر 35 يوم", age: "35 يوم", date: "2026-07-15", status: "تمت" }
        ]
      }
    ],
    visits: [
      {
        id: "v_1_1",
        breederId: "breeder_1",
        farmId: "farm_1_1",
        date: "2026-07-22",
        age: "30 يوم",
        cycle: "دورة صيف يوليو 2026",
        cost: 3500,
        paid: 1000,
        debt: 2500,
        mortality: { today: 35, yesterday: 28, dayBefore: 15 },
        temperature: 28,
        symptoms: "عطس شديد، خشخشة بصدر الطيور، والتفاف رقبة في بعض الحالات.",
        medicinesLast5Days: "تايلوزين ومضاد معوي.",
        differentialDiagnosis: "اشتباه نيوكاسل عتر ضارية ND.",
        finalDiagnosis: "فيروس نيوكاسل (NDV) مع عدوى بكتيرية ثانوية.",
        prescriptions: [
          { name: "تايلوكير (Tylocare) + دوكسي سيكلين", dose: "0.5 جرام من كل نوع / لتر مياه شرب لمدة 5 أيام" },
          { name: "فيتامين ك3 مائي + رافع مناعة", dose: "0.5 جرام / لتر مستمر 4 أيام" }
        ],
        labTests: {
          pcr: true,
          pcrDetails: "إيجابي نيوكاسل NDV APMV-1",
          elisa: false,
          elisaDetails: "",
          sensitivity: false,
          sensitivityDetails: "",
          immunity: true,
          immunityDetails: "تشتت في مناعات الكولون"
        },
        generalNotes: "تدفئة العنبر، منع الإجهاد تماماً، ورش يود مطهر فوق الطيور."
      }
    ]
  },
  {
    id: "breeder_2",
    name: "مزرعة الأمل (المهندس محمد)",
    phone: "01555554433",
    address: "الزقازيق، الشرقية",
    preferredPharmacyId: "pharmacy_1",
    financialStatus: {
      hasDebt: false,
      debtAmount: 0,
      notes: "خالص الحساب بالكامل"
    },
    farms: [
      {
        id: "farm_2_1",
        name: "عنبر 1 - أمهات هجين",
        type: "أمهات",
        breed: "كوب 500 (Cobb 500)",
        hatchery: "الوطنية للجدود",
        capacity: 12000,
        status: "نشط",
        vaccinations: [
          { name: "تحصين إنفلونزا H9 زيتي", age: "16 أسبوع", date: "2026-06-10", status: "تمت" }
        ]
      }
    ],
    visits: [
      {
        id: "v_2_1",
        breederId: "breeder_2",
        farmId: "farm_2_1",
        date: "2026-07-15",
        age: "22 أسبوع",
        cycle: "دورة إنتاج أمهات 2026",
        cost: 2000,
        paid: 2000,
        debt: 0,
        mortality: { today: 4, yesterday: 5, dayBefore: 3 },
        temperature: 24,
        symptoms: "تراجع في إنتاج البيض بنسبة 15% مع قشرة رقيقة ومبرقشة.",
        medicinesLast5Days: "جرعة كولين وفيتامينات هـ سلينيوم.",
        differentialDiagnosis: "عدوى بكتيرية حادة للقولون.",
        finalDiagnosis: "عدوى بكتيرية قولونية (E. coli Septicemia) في المبيض.",
        prescriptions: [
          { name: "بان فلور (Panflor) + كولستين", dose: "1 مل بان فلور + 0.5 جم كولستين / لتر لمدة 4 أيام" },
          { name: "فيتامين أد3هـ مستورد", dose: "1 مل / لتر مياه شرب لمدة 3 أيام" }
        ],
        labTests: {
          pcr: true,
          pcrDetails: "سلبي إنفلونزا، إيجابي E. coli شديد الحساسية",
          elisa: true,
          elisaDetails: "مناعات ممتازة للـ ND",
          sensitivity: true,
          sensitivityDetails: "حساس جداً للفلورفينيكول والتايلوزين",
          immunity: false,
          immunityDetails: ""
        },
        generalNotes: "غسيل خطوط المياه وتطهير النبل ببروكسيد الهيدروجين."
      }
    ]
  }
];

// قوالب التشخيص المسبقة التلقائية
const PRESCRIPTION_TEMPLATES = {
  "newcastle": {
    name: "علاج نيوكاسل (NDV)",
    diagnosis: "فيروس نيوكاسل (NDV) مع عدوى بكتيرية ثانوية",
    prescriptions: [
      { name: "تايلوكير (Tylocare) + دوكسي سيكلين", dose: "0.5 جرام من كل نوع / لتر لمدة 5 أيام" },
      { name: "فيتامين ك3 مائي + رافع مناعة", dose: "0.5 جرام / لتر مستمر 4 أيام" }
    ],
    notes: "تحسين التدفئة، رش يود مطهر فوق الطيور، رفع المناعة الحيوية."
  },
  "coccidiosis": {
    name: "علاج كوكسيديا معوية",
    diagnosis: "كوكسيديا معوية نشطة مصحوبة بالتهاب أمعاء",
    prescriptions: [
      { name: "أمبروليوم 20% + فيتامين ك3 مائي", dose: "1 جرام أمبروليوم + 0.5 جرام ك3 / لتر لمدة 5 أيام" },
      { name: "غسيل كلى ومنشط كبد", dose: "1 مل / لتر لمدة 3 أيام" }
    ],
    notes: "تغيير الفرشة ورش جير مطفي لمنع تحوصل البويضات وتطهير خطوط المياه."
  }
};

// تعليق البيانات عالمياً في المتصفح
window.MOCK_MEDICINES = MOCK_MEDICINES;
window.MOCK_PHARMACIES = MOCK_PHARMACIES;
window.MOCK_DATA = MOCK_DATA;
window.PRESCRIPTION_TEMPLATES = PRESCRIPTION_TEMPLATES;
