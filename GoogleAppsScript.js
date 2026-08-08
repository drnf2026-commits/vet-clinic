// سكريبت جوجل آب سكريبت المطور لمزامنة مزارع الدواجن ومكاتب الأدوية المتعددة
// الصق هذا الكود بالكامل في محرر Apps Script المربوط بجداول بيانات جوجل الخاص بك

function doGet(e) {
  var action = e.parameter.action;
  
  if (action === "testConnection") {
    return ContentService.createTextOutput("connected")
      .setMimeType(ContentService.MimeType.TEXT);
  }
  
  if (action === "getAllData") {
    var data = getAllData();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput("Invalid Action")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);
    
    if (action === "saveVisit") {
      saveBreeder(ss, postData.breeder);
      saveVisit(ss, postData.visit);
      
      // مزامنة المزارع المضافة
      if (postData.breeder.farms) {
        postData.breeder.farms.forEach(function(farm) {
          saveFarm(ss, postData.breeder.id, farm);
        });
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "settleDebt") {
      updateBreederDebt(ss, postData.breederId, postData.debtAmount);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// تهيئة الجداول والأعمدة تلقائياً
function initSheets(ss) {
  // 1. جدول المربين
  var breedersSheet = ss.getSheetByName("Breeders");
  if (!breedersSheet) {
    breedersSheet = ss.insertSheet("Breeders");
    var headers = ["id", "name", "phone", "address", "preferredPharmacyId", "hasDebt", "debtAmount", "notes"];
    breedersSheet.appendRow(headers);
    breedersSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#ffd700");
  }

  // 2. جدول المزارع والعنابر
  var farmsSheet = ss.getSheetByName("Farms");
  if (!farmsSheet) {
    farmsSheet = ss.insertSheet("Farms");
    var headers = ["id", "breederId", "name", "type", "breed", "hatchery", "capacity", "status", "vaccinations"];
    farmsSheet.appendRow(headers);
    farmsSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#87ceeb");
  }

  // 3. جدول الزيارات والكشوفات
  var visitsSheet = ss.getSheetByName("Visits");
  if (!visitsSheet) {
    visitsSheet = ss.insertSheet("Visits");
    var headers = [
      "id", "breederId", "farmId", "date", "age", "cycle", "cost", "paid", "debt",
      "mortalityToday", "mortalityYesterday", "mortalityDayBefore", 
      "temperature", "symptoms", "medicinesLast5Days", 
      "differentialDiagnosis", "finalDiagnosis", "prescriptions", 
      "labTests", "generalNotes"
    ];
    visitsSheet.appendRow(headers);
    visitsSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#98fb98");
  }

  // 4. جدول مكاتب الأدوية البيطرية
  var pharmaciesSheet = ss.getSheetByName("Pharmacies");
  if (!pharmaciesSheet) {
    pharmaciesSheet = ss.insertSheet("Pharmacies");
    var headers = ["id", "name", "manager", "phone", "address", "inventory"];
    pharmaciesSheet.appendRow(headers);
    pharmaciesSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#dda0dd");
  }
}

// جلب وتجميع قاعدة البيانات الكاملة بصيغة JSON متجانسة للعيادة
function getAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  initSheets(ss);
  
  var breeders = getTableData(ss, "Breeders");
  var farms = getTableData(ss, "Farms");
  var visits = getTableData(ss, "Visits");
  var pharmacies = getTableData(ss, "Pharmacies");
  
  // دمج المزارع والزيارات لكل مربي
  var breedersMap = {};
  breeders.forEach(function(b) {
    b.farms = [];
    b.visits = [];
    b.financialStatus = {
      hasDebt: b.hasDebt === "true" || b.hasDebt === true,
      debtAmount: Number(b.debtAmount) || 0,
      notes: b.notes || ""
    };
    breedersMap[b.id] = b;
  });
  
  farms.forEach(function(f) {
    if (breedersMap[f.breederId]) {
      // تفكيك التحصينات المخزنة كـ JSON
      try {
        f.vaccinations = JSON.parse(f.vaccinations || "[]");
      } catch(e) {
        f.vaccinations = [];
      }
      f.capacity = Number(f.capacity) || 0;
      breedersMap[f.breederId].farms.push(f);
    }
  });
  
  visits.forEach(function(v) {
    if (breedersMap[v.breederId]) {
      // تفكيك التراكيب المركبة
      v.cost = Number(v.cost) || 0;
      v.paid = Number(v.paid) || 0;
      v.debt = Number(v.debt) || 0;
      v.temperature = Number(v.temperature) || 0;
      
      try { v.mortality = JSON.parse(v.mortality || "{}"); } catch(e) { v.mortality = { today: 0, yesterday: 0, dayBefore: 0 }; }
      try { v.prescriptions = JSON.parse(v.prescriptions || "[]"); } catch(e) { v.prescriptions = []; }
      try { v.labTests = JSON.parse(v.labTests || "{}"); } catch(e) { v.labTests = {}; }
      
      breedersMap[v.breederId].visits.push(v);
    }
  });
  
  // تفكيك مخزونات الصيدليات
  pharmacies.forEach(function(p) {
    try {
      p.inventory = JSON.parse(p.inventory || "[]");
    } catch(e) {
      p.inventory = [];
    }
  });
  
  var breedersList = Object.keys(breedersMap).map(function(key) {
    return breedersMap[key];
  });
  
  return {
    breeders: breedersList,
    pharmacies: pharmacies
  };
}

function getTableData(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var data = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    data.push(obj);
  }
  return data;
}

// حفظ بيانات العميل في شيت Breeders
function saveBreeder(ss, breeder) {
  var sheet = ss.getSheetByName("Breeders");
  var data = sheet.getDataRange().getValues();
  var foundIndex = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === breeder.id) {
      foundIndex = i + 1;
      break;
    }
  }
  
  var rowData = [
    breeder.id,
    breeder.name,
    breeder.phone,
    breeder.address,
    breeder.preferredPharmacyId || "",
    breeder.financialStatus.hasDebt,
    breeder.financialStatus.debtAmount,
    breeder.financialStatus.notes || ""
  ];
  
  if (foundIndex !== -1) {
    sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

// حفظ أو تحديث المزارع في شيت Farms
function saveFarm(ss, breederId, farm) {
  var sheet = ss.getSheetByName("Farms");
  var data = sheet.getDataRange().getValues();
  var foundIndex = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === farm.id) {
      foundIndex = i + 1;
      break;
    }
  }
  
  var vacStr = JSON.stringify(farm.vaccinations || []);
  var rowData = [
    farm.id,
    breederId,
    farm.name,
    farm.type,
    farm.breed || "",
    farm.hatchery || "",
    farm.capacity,
    farm.status,
    vacStr
  ];
  
  if (foundIndex !== -1) {
    sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

// حفظ الزيارة في شيت Visits
function saveVisit(ss, visit) {
  var sheet = ss.getSheetByName("Visits");
  
  var mortalityStr = JSON.stringify(visit.mortality);
  var prescriptionsStr = JSON.stringify(visit.prescriptions);
  var labTestsStr = JSON.stringify(visit.labTests);
  
  var rowData = [
    visit.id,
    visit.breederId,
    visit.farmId,
    visit.date,
    visit.age,
    visit.cycle,
    visit.cost,
    visit.paid,
    visit.debt,
    visit.mortality.today,
    visit.mortality.yesterday,
    visit.mortality.dayBefore,
    visit.temperature,
    visit.symptoms,
    visit.medicinesLast5Days,
    visit.differentialDiagnosis,
    visit.finalDiagnosis,
    prescriptionsStr,
    labTestsStr,
    visit.generalNotes
  ];
  
  sheet.appendRow(rowData);
}

// تحديث مديونية عميل فقط عند السداد المباشر
function updateBreederDebt(ss, breederId, debtAmount) {
  var sheet = ss.getSheetByName("Breeders");
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === breederId) {
      var row = i + 1;
      sheet.getRange(row, 6).setValue(debtAmount > 0); //hasDebt
      sheet.getRange(row, 7).setValue(debtAmount);    //debtAmount
      sheet.getRange(row, 8).setValue(debtAmount > 0 ? "مديونية معلقة" : "خالص الحساب بالتسوية");
      break;
    }
  }
}
