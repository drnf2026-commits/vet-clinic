// منطق العمل وتفاعل الواجهات لتطبيق معمل دكتورة نجلاء المطور والمتجاوب بالكامل

// متغيرات الحالة العامة للتطبيق
let breedersData = [];
let pharmaciesData = [];
let selectedBreeder = null;      // العميل المختار في شاشة التاريخ المرضي
let selectedPharmacy = null;     // صيدلية مكتب الأدوية المختار لمشاهدة مخزونه
let activeFarmForVac = null;     // العنبر المختار حالياً لإضافة التحصينات له
let syncSettings = {
  appsScriptUrl: "",
  syncMode: "local" // local | cloud
};

// ====================================================
// تهيئة التطبيق عند تحميل الصفحة (Initialization)
// ====================================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. تحميل الإعدادات وقاعدة البيانات
  loadSettings();
  initDatabase();

  // 2. ضبط التاريخ الافتراضي اليوم
  const datePicker = document.getElementById("accounts-date-picker");
  const todayStr = new Date().toISOString().split('T')[0];
  if (datePicker) datePicker.value = todayStr;
  
  const visitDateInput = document.getElementById("visit-last-sample-date");
  if (visitDateInput) visitDateInput.value = todayStr;

  // 3. ربط أحداث البحث العلوي الموحد
  const searchInput = document.getElementById("main-breeder-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => handleMainSearch(e.target.value));
    
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-wrapper")) {
        document.getElementById("search-suggestions-dropdown").style.display = "none";
      }
    });
  }

  // 4. رندرة الإحصائيات الافتراضية
  renderDashboard();
  renderFarmsTable();
  renderPharmaciesTable();
  populateDropdowns();

  // 5. تهيئة صفوف الروشتة الافتراضية
  resetPrescriptionBuilder();

  // 6. المزامنة السحابية إذا كانت نشطة
  if (syncSettings.syncMode === "cloud" && syncSettings.appsScriptUrl) {
    syncWithGoogleSheets();
  }
});

// ====================================================
// منطق التحكم بقاعدة البيانات المحلية والتبويبات
// ====================================================
function initDatabase() {
  try {
    const localData = localStorage.getItem("poultry_breeders_db_v2");
    const localPharmacies = localStorage.getItem("poultry_pharmacies_db_v2");

    if (localData) {
      breedersData = JSON.parse(localData);
    } else {
      breedersData = window.MOCK_DATA || [];
      localStorage.setItem("poultry_breeders_db_v2", JSON.stringify(breedersData));
    }

    if (localPharmacies) {
      pharmaciesData = JSON.parse(localPharmacies);
    } else {
      pharmaciesData = window.MOCK_PHARMACIES || [];
      localStorage.setItem("poultry_pharmacies_db_v2", JSON.stringify(pharmaciesData));
    }

    // هجرة وهيكلة البيانات لضمان عدم حدوث كراش للمربين القدامى
    breedersData.forEach(b => {
      if (!b.farms) b.farms = [];
      if (!b.visits) b.visits = [];
      if (!b.financialStatus) b.financialStatus = { hasDebt: false, debtAmount: 0, notes: "" };
    });

  } catch (e) {
    console.error("خطأ في قراءة قاعدة البيانات، جاري تصفير البيانات الافتراضية:", e);
    breedersData = window.MOCK_DATA || [];
    pharmaciesData = window.MOCK_PHARMACIES || [];
    saveDataToLocal();
  }
}

function saveDataToLocal() {
  localStorage.setItem("poultry_breeders_db_v2", JSON.stringify(breedersData));
  localStorage.setItem("poultry_pharmacies_db_v2", JSON.stringify(pharmaciesData));
  
  // إعادة رندرة الشاشات المفتوحة
  renderDashboard();
  renderFarmsTable();
  renderPharmaciesTable();
  populateDropdowns();
  
  if (selectedBreeder) {
    // تحديث تفاصيل المربي إذا كان معروضاً حالياً
    selectBreederFromSearch(selectedBreeder.id);
  }
}

function loadSettings() {
  try {
    const settingsRaw = localStorage.getItem("poultry_sync_settings_v2");
    if (settingsRaw) {
      syncSettings = JSON.parse(settingsRaw);
      const urlEl = document.getElementById("setting-apps-script-url");
      const modeEl = document.getElementById("setting-sync-mode");
      if (urlEl) urlEl.value = syncSettings.appsScriptUrl || "";
      if (modeEl) modeEl.value = syncSettings.syncMode || "local";
      toggleSyncModeUI(syncSettings.syncMode || "local");
    }
  } catch (e) {
    console.error("خطأ في تحميل الإعدادات:", e);
  }
}

function saveSettings() {
  const url = document.getElementById("setting-apps-script-url").value.trim();
  const mode = document.getElementById("setting-sync-mode").value;

  syncSettings.appsScriptUrl = url;
  syncSettings.syncMode = mode;

  localStorage.setItem("poultry_sync_settings_v2", JSON.stringify(syncSettings));
  toggleSyncModeUI(mode);
  showToast("تم حفظ إعدادات المزامنة والاتصال بنجاح", "success");

  if (mode === "cloud" && url) {
    syncWithGoogleSheets();
  }
}

function toggleSyncModeUI(mode) {
  const badge = document.getElementById("sync-status-badge");
  const text = document.getElementById("sync-status-text");
  if (mode === "cloud") {
    badge.className = "sync-badge";
    text.textContent = "المزامنة السحابية نشطة (Google Sheets)";
  } else {
    badge.className = "sync-badge sync-error";
    text.textContent = "تخزين محلي فقط (مستقر وأوفلاين)";
  }
}

// تبديل الأقسام والتبويبات
function switchTab(tabName) {
  // إزالة الكلاسات النشطة
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));

  // تفعيل التبويب المطلوب
  const navItem = document.getElementById(`nav-${tabName}`);
  const tabContent = document.getElementById(`tab-${tabName}-content`);
  
  if (navItem) navItem.classList.add("active");
  if (tabContent) tabContent.classList.add("active");

  // مهام خاصة عند فتح شاشات معينة
  if (tabName === "dashboard") {
    renderDashboard();
  } else if (tabName === "farms") {
    renderFarmsTable();
  } else if (tabName === "pharmacy") {
    renderPharmaciesTable();
  } else if (tabName === "accounts") {
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById("accounts-date-picker").value = todayStr;
    renderFinancialAccounts(todayStr);
  }

  // إغلاق المينيو الجانبي على الموبايل تلقائياً بعد الاختيار
  const sidebar = document.getElementById("sidebar-drawer");
  if (sidebar && sidebar.classList.contains("active")) {
    sidebar.classList.remove("active");
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar-drawer");
  if (sidebar) {
    sidebar.classList.toggle("active");
  }
}

// ====================================================
// منطق شاشة لوحة التحكم العامة (Dashboard Module)
// ====================================================
function renderDashboard() {
  // حساب الإحصائيات الإجمالية
  let totalBreeders = breedersData.length;
  let totalFarms = 0;
  let totalVisits = 0;
  let totalPharmacies = pharmaciesData.length;

  breedersData.forEach(b => {
    totalFarms += (b.farms || []).length;
    totalVisits += (b.visits || []).length;
  });

  const breedersEl = document.getElementById("stat-total-breeders");
  const farmsEl = document.getElementById("stat-total-farms");
  const visitsEl = document.getElementById("stat-total-visits");
  const pharEl = document.getElementById("stat-total-pharmacies");

  if (breedersEl) breedersEl.textContent = totalBreeders;
  if (farmsEl) farmsEl.textContent = totalFarms;
  if (visitsEl) visitsEl.textContent = totalVisits;
  if (pharEl) pharEl.textContent = totalPharmacies;

  // جلب آخر كشوفات بالمعمل لعرضها
  const recentVisitsRows = document.getElementById("dashboard-recent-visits-rows");
  if (recentVisitsRows) {
    recentVisitsRows.innerHTML = "";
    
    // جمع كل زيارات المربين في قائمة واحدة
    let allVisits = [];
    breedersData.forEach(b => {
      (b.visits || []).forEach(v => {
        const farmObj = b.farms.find(f => f.id === v.farmId) || {};
        allVisits.push({
          breederName: b.name,
          breederId: b.id,
          farmName: farmObj.name || "عنبر غير محدد",
          age: v.age,
          date: v.date,
          finalDiagnosis: v.finalDiagnosis,
          id: v.id
        });
      });
    });

    // ترتيب الزيارات تنازلياً حسب التاريخ
    allVisits.sort((a,b) => new Date(b.date) - new Date(a.date));

    if (allVisits.length === 0) {
      recentVisitsRows.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">لا يوجد زيارات أو كشوفات مسجلة بعد</td></tr>`;
      return;
    }

    allVisits.slice(0, 5).forEach(v => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--accent-cyan); cursor:pointer;" onclick="selectBreederFromSearch('${v.breederId}')">${v.breederName}</td>
        <td>${v.farmName}</td>
        <td>${v.age}</td>
        <td>📅 ${v.date}</td>
        <td style="font-weight:bold; color:var(--color-gold);">${v.finalDiagnosis}</td>
        <td>
          <button class="btn-secondary-outline" style="padding:4px 8px; font-size:11px;" onclick="selectBreederFromSearch('${v.breederId}')">🔍 عرض الملف</button>
        </td>
      `;
      recentVisitsRows.appendChild(tr);
    });
  }
}

// ====================================================
// البحث الفوري التفاعلي (Live Search Engines)
// ====================================================
function normalizeArabic(text) {
  if (!text) return "";
  return text
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ئ/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/[\u064B-\u065F]/g, "") // إزالة التشكيل
    .trim()
    .toLowerCase();
}

function handleMainSearch(query) {
  const dropdown = document.getElementById("search-suggestions-dropdown");
  if (!query.trim()) {
    dropdown.style.display = "none";
    return;
  }

  const normQuery = normalizeArabic(query);
  const matches = [];

  // 1. البحث في المربين
  breedersData.forEach(b => {
    if (normalizeArabic(b.name).includes(normQuery) || normalizeArabic(b.phone).includes(normQuery) || normalizeArabic(b.address).includes(normQuery)) {
      matches.push({
        type: "client",
        id: b.id,
        title: b.name,
        subtitle: `📱 عميل - هاتف: ${b.phone} - ${b.address}`
      });
    }
  });

  // 2. البحث في مكاتب الأدوية
  pharmaciesData.forEach(p => {
    if (normalizeArabic(p.name).includes(normQuery) || normalizeArabic(p.manager).includes(normQuery) || normalizeArabic(p.address).includes(normQuery)) {
      matches.push({
        type: "pharmacy",
        id: p.id,
        title: p.name,
        subtitle: `🏢 مكتب أدوية بيطرية - د. ${p.manager} - ${p.address}`
      });
    }
  });

  if (matches.length === 0) {
    dropdown.innerHTML = `<div style="padding:15px; color:var(--text-muted); text-align:center; font-size:12px;">لا يوجد عملاء أو مكاتب مطابقة للبحث</div>`;
    dropdown.style.display = "block";
    return;
  }

  dropdown.innerHTML = "";
  matches.slice(0, 6).forEach(m => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.innerHTML = `
      <div>
        <div class="name">${m.title}</div>
        <div class="sub">${m.subtitle}</div>
      </div>
    `;
    item.onclick = () => {
      dropdown.style.display = "none";
      document.getElementById("main-breeder-search").value = "";
      
      if (m.type === "client") {
        selectBreederFromSearch(m.id);
      } else {
        switchTab("pharmacy");
        selectPharmacyForInventory(m.id);
      }
    };
    dropdown.appendChild(item);
  });
  dropdown.style.display = "block";
}

// ====================================================
// إدارة ملفات العملاء والتاريخ المرضي والنافق للدورات
// ====================================================
function selectBreederFromSearch(breederId) {
  const breeder = breedersData.find(b => b.id === breederId);
  if (!breeder) return;

  selectedBreeder = breeder;
  switchTab("clients");

  document.getElementById("no-client-selected-view").style.display = "none";
  document.getElementById("client-dashboard-view").style.display = "grid";

  // تعبئة البيانات الأساسية
  document.getElementById("profile-name").textContent = breeder.name;
  document.getElementById("profile-phone").textContent = breeder.phone;
  document.getElementById("profile-address").textContent = breeder.address;
  
  // الصيدلية المفضلة
  const phObj = pharmaciesData.find(p => p.id === breeder.preferredPharmacyId);
  document.getElementById("profile-preferred-pharmacy").textContent = phObj ? phObj.name : "لم يتم تحديد صيدلية معتمدة";

  // رندرة العنابر التابعة للعميل في الكارت الجانبي
  const farmsListContainer = document.getElementById("profile-farms-list");
  farmsListContainer.innerHTML = "";
  if (!breeder.farms || breeder.farms.length === 0) {
    farmsListContainer.innerHTML = `<span style="font-size:12px; color:var(--text-muted);">لا يوجد عنابر مسجلة للعميل</span>`;
  } else {
    breeder.farms.forEach(f => {
      const badge = document.createElement("div");
      badge.style.cssText = "background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:8px; border-radius:6px; font-size:12px;";
      badge.innerHTML = `🏠 <strong>${f.name}</strong> (${f.type} - سعة: ${f.capacity.toLocaleString()}) <span class="badge ${f.status === 'نشط' ? 'success' : 'danger'}" style="float:left;">${f.status}</span>`;
      farmsListContainer.appendChild(badge);
    });
  }

  // تحديث كارت الموقف المالي للعميل
  const debtAmt = breeder.financialStatus ? breeder.financialStatus.debtAmount : 0;
  const financialBanner = document.getElementById("breeder-financial-banner");
  const debtValEl = document.getElementById("financial-debt-amount");
  const notesEl = document.getElementById("financial-notes-display");

  if (debtAmt > 0) {
    financialBanner.className = "financial-banner has-debt";
    debtValEl.innerHTML = `${debtAmt.toLocaleString()} <span class="currency">ج.م</span>`;
    notesEl.textContent = breeder.financialStatus.notes || "يوجد مبالغ كشوفات لم تسدد بعد";
  } else {
    financialBanner.className = "financial-banner no-debt";
    debtValEl.innerHTML = `خالص تماماً <span class="currency">✔️</span>`;
    notesEl.textContent = "الحساب المالي للعميل سليم وخالص";
  }

  // رندرة سجل الأدوية والتنبيهات
  renderClientMedHistory(breeder);

  // تحديث محدد الدورات وتعبئته بالخيارات
  const cycleSelector = document.getElementById("dashboard-cycle-selector");
  cycleSelector.innerHTML = '<option value="">-- اختر الدورة الإنتاجية --</option>';
  const uniqueCycles = new Set();
  (breeder.visits || []).forEach(v => {
    if (v.cycle) uniqueCycles.add(v.cycle);
  });
  uniqueCycles.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    cycleSelector.appendChild(opt);
  });
  document.getElementById("cycle-report-content").style.display = "none";

  // رندرة الخط الزمني للزيارات الطبية
  renderClientVisitsTimeline(breeder);
}

function renderClientMedHistory(breeder) {
  const tbody = document.getElementById("breeder-medicines-history-rows");
  tbody.innerHTML = "";

  const medHistory = [];
  (breeder.visits || []).forEach(v => {
    (v.prescriptions || []).forEach(p => {
      medHistory.push({
        name: p.name,
        activeIngredient: p.activeIngredient || "غير محددة",
        date: v.date,
        age: v.age
      });
    });
  });

  if (medHistory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">لا يوجد سجل أدوية سابق للعميل</td></tr>`;
    document.getElementById("active-withdrawal-warnings-card").style.display = "none";
    return;
  }

  // تحديد التحذيرات وفترات الأمان
  const warningsList = document.getElementById("withdrawal-warnings-list");
  warningsList.innerHTML = "";
  let hasWarnings = false;

  medHistory.forEach(med => {
    // حساب فترة الأمان بناءً على الكتالوج
    const catalogItem = window.MEDICINE_CATALOG[med.name];
    let badgeHtml = `<span class="badge success">آمن للاستهلاك (منتهي)</span>`;
    
    if (catalogItem && catalogItem.withdrawalDays > 0) {
      const dateMed = new Date(med.date);
      const dateNow = new Date();
      const diffTime = dateNow - dateMed;
      const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (daysPassed < catalogItem.withdrawalDays) {
        hasWarnings = true;
        const daysLeft = catalogItem.withdrawalDays - daysPassed;
        badgeHtml = `<span class="badge danger">⚠️ غير آمن (متبقي ${daysLeft} يوم)</span>`;
        
        const li = document.createElement("li");
        li.innerHTML = `دواء <strong>${med.name}</strong> الموصوف في كشف تاريخ ${med.date} (لا يزال تحت فترة سحب أمان بيولوجي مدتها ${catalogItem.withdrawalDays} يوماً، متبقي منها ${daysLeft} يوماً).`;
        warningsList.appendChild(li);
      }
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight:bold; color:var(--accent-cyan);">${med.name}</td>
      <td>📅 ${med.date} (عمر: ${med.age})</td>
      <td>${med.activeIngredient}</td>
      <td>${badgeHtml}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("active-withdrawal-warnings-card").style.display = hasWarnings ? "block" : "none";
}

function renderClientVisitsTimeline(breeder) {
  const container = document.getElementById("breeder-visits-timeline");
  container.innerHTML = "";

  if (!breeder.visits || breeder.visits.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); text-align:center; font-size:12px;">لا يوجد كشوفات أو زيارات سابقة للعميل</div>`;
    return;
  }

  breeder.visits.forEach(v => {
    const farmObj = breeder.farms.find(f => f.id === v.farmId) || {};
    const div = document.createElement("div");
    div.className = "timeline-item";
    
    let medsHtml = (v.prescriptions || []).map(p => `<strong>${p.name}</strong> (${p.dose})`).join(" ، ");
    
    div.innerHTML = `
      <div class="timeline-header">
        <span class="timeline-title">🩺 ${v.finalDiagnosis} (${farmObj.name || "عنبر عام"})</span>
        <span class="timeline-date">📅 تاريخ: ${v.date} - عمر: ${v.age}</span>
      </div>
      <div class="timeline-body">
        <p>📋 الأعراض والتشريح: ${v.symptoms || "لم تدون أعراض تفصيلية"}</p>
        <p style="margin-top:5px; color:var(--accent-cyan);">💊 الروشتة الموجهة: ${medsHtml || "لا يوجد أدوية موصوفة"}</p>
        <p style="margin-top:5px; font-size:11px; color:var(--text-muted);">🔬 الفحوصات المعملية: PCR: ${v.labTests.pcr ? "إيجابي" : "لا يوجد"} | ELISA: ${v.labTests.elisa ? "نعم" : "لا يوجد"} | الحساسية: ${v.labTests.sensitivity ? "نعم" : "لا يوجد"}</p>
        <div style="margin-top:8px;">
          <button class="btn-secondary-outline" style="padding:4px 8px; font-size:11px;" onclick="printSpecificVisitRx('${breeder.id}', '${v.id}')">🖨️ إعادة طباعة الروشتة</button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

function renderCycleReport(cycleName) {
  const content = document.getElementById("cycle-report-content");
  if (!cycleName || !selectedBreeder) {
    content.style.display = "none";
    return;
  }

  const visits = selectedBreeder.visits.filter(v => v.cycle === cycleName);
  if (visits.length === 0) {
    content.style.display = "none";
    return;
  }

  // حساب الإحصائيات الشاملة للدورة المحددة للنافق والأدوية
  let totalMortality = 0;
  let uniqueDiagnoses = new Set();
  let uniqueMeds = new Set();
  let startDate = visits[visits.length - 1].date; // الأقدم
  let endDate = visits[0].date;                   // الأحدث
  let totalCapacity = 0;

  visits.forEach(v => {
    totalMortality += (v.mortality.today || 0) + (v.mortality.yesterday || 0) + (v.mortality.dayBefore || 0);
    if (v.finalDiagnosis) uniqueDiagnoses.add(v.finalDiagnosis);
    (v.prescriptions || []).forEach(p => uniqueMeds.add(p.name));
    
    // جلب سعة العنبر
    const farmObj = selectedBreeder.farms.find(f => f.id === v.farmId);
    if (farmObj && farmObj.capacity) {
      totalCapacity = Math.max(totalCapacity, farmObj.capacity);
    }
  });

  const mortalityPercent = totalCapacity > 0 ? ((totalMortality / totalCapacity) * 100).toFixed(2) : "0.00";

  content.innerHTML = `
    <h4 style="color:var(--accent-blue-hover); font-size:13px; margin-bottom:8px;">📊 ملخص الدورة: ${cycleName}</h4>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; line-height:1.6;">
      <div>📅 فترة الدورة: <strong>من ${startDate} إلى ${endDate}</strong></div>
      <div>🩺 إجمالي الكشوفات المسجلة: <strong>${visits.length} كشف</strong></div>
      <div>💀 إجمالي النافق المتراكم: <strong>${totalMortality.toLocaleString()} طائر</strong></div>
      <div>📈 نسبة النافق الإجمالية للدورة: <strong style="color:${mortalityPercent > 5 ? 'var(--color-danger)' : 'var(--color-success)'};">${mortalityPercent}% (من إجمالي سعة ${totalCapacity.toLocaleString()} طائر)</strong></div>
    </div>
    <div style="margin-top:10px; font-size:12px; border-top:1px solid rgba(255,255,255,0.05); padding-top:8px;">
      <span style="color:var(--color-gold); font-weight:bold;">🦠 الأمراض التي ظهرت بالدورة:</span>
      <p style="margin-top:2px;">${Array.from(uniqueDiagnoses).join(' ، ') || 'لا يوجد'}</p>
    </div>
    <div style="margin-top:8px; font-size:12px;">
      <span style="color:var(--accent-cyan); font-weight:bold;">💊 الأدوية التي تناولتها الطيور بالدورة:</span>
      <p style="margin-top:2px;">${Array.from(uniqueMeds).join(' ، ') || 'لا يوجد'}</p>
    </div>
  `;
  content.style.display = "block";
}

// ====================================================
// إدارة العنابر والمستودعات والتحصينات (Farms & Vaccinations)
// ====================================================
function renderFarmsTable() {
  const tbody = document.getElementById("farms-table-rows");
  if (!tbody) return;
  tbody.innerHTML = "";

  let farmsCount = 0;
  breedersData.forEach(b => {
    (b.farms || []).forEach(f => {
      farmsCount++;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--accent-cyan); cursor:pointer;" onclick="selectBreederFromSearch('${b.id}')">${b.name}</td>
        <td>🏠 ${f.name}</td>
        <td>${f.type}</td>
        <td>${f.breed || "-"}</td>
        <td>${f.capacity.toLocaleString()} طائر</td>
        <td><span class="badge ${f.status === 'نشط' ? 'success' : 'danger'}">${f.status}</span></td>
        <td>
          <button class="btn-secondary-outline" style="padding:4px 8px; font-size:11px;" onclick="loadFarmVaccinationsTab('${b.id}', '${f.id}')">💉 جدول التحصينات</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });

  if (farmsCount === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">لا يوجد عنابر مسجلة في التطبيق حالياً</td></tr>`;
  }
}

// تحميل التحصينات وعرضها
function handleVacBreederChange(breederId) {
  const farmSelect = document.getElementById("vac-farm-select");
  farmSelect.innerHTML = '<option value="">-- اختر العنبر --</option>';
  document.getElementById("farm-vaccinations-display").style.display = "none";

  if (!breederId) return;

  const breeder = breedersData.find(b => b.id === breederId);
  if (breeder && breeder.farms) {
    breeder.farms.forEach(f => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = `${f.name} (${f.type})`;
      farmSelect.appendChild(opt);
    });
  }
}

function loadFarmVaccinationsTab(breederId, farmId) {
  switchTab("vaccinations");
  document.getElementById("vac-breeder-select").value = breederId;
  handleVacBreederChange(breederId);
  document.getElementById("vac-farm-select").value = farmId;
  loadFarmVaccinations(farmId);
}

function loadFarmVaccinations(farmId) {
  const displayContainer = document.getElementById("farm-vaccinations-display");
  const tbody = document.getElementById("farm-vaccination-rows");
  
  if (!farmId) {
    displayContainer.style.display = "none";
    return;
  }

  const breederId = document.getElementById("vac-breeder-select").value;
  const breeder = breedersData.find(b => b.id === breederId);
  if (!breeder) return;

  const farm = breeder.farms.find(f => f.id === farmId);
  if (!farm) return;

  activeFarmForVac = farm; // حفظ العنبر النشط لإضافة التحصين لاحقاً
  tbody.innerHTML = "";
  
  document.getElementById("vac-farm-title").innerHTML = `💉 سجل تحصينات العنبر: <strong>${farm.name}</strong> (${farm.type} - سلالة: ${farm.breed || 'غير محددة'})`;

  if (!farm.vaccinations || farm.vaccinations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:15px;">لا يوجد تحصينات معملية مسجلة بعد لهذا العنبر</td></tr>`;
    displayContainer.style.display = "block";
    return;
  }

  farm.vaccinations.forEach((v, index) => {
    const tr = document.createElement("tr");
    const badgeClass = v.status === "تمت" ? "success" : "warning";
    tr.innerHTML = `
      <td style="font-weight:bold; color:var(--accent-cyan);">${v.name}</td>
      <td>${v.age}</td>
      <td>📅 ${v.date}</td>
      <td><span class="badge ${badgeClass}">${v.status}</span></td>
      <td>
        <button class="btn-danger" style="padding:2px 6px; font-size:10px; border-radius:4px;" onclick="deleteVaccination(${index})">🗑️ حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  displayContainer.style.display = "block";
}

// ====================================================
// إدارة مكاتب الأدوية ومخزوناتها (Pharmacy Inventory)
// ====================================================
function renderPharmaciesTable() {
  const tbody = document.getElementById("pharmacies-table-rows");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (pharmaciesData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">لا يوجد مكاتب أدوية مسجلة بالتطبيق</td></tr>`;
    return;
  }

  pharmaciesData.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight:bold; color:var(--color-gold);">${p.name}</td>
      <td>${p.manager}</td>
      <td>📱 ${p.phone}</td>
      <td>${p.address}</td>
      <td style="text-align:center; font-weight:bold; color:var(--accent-cyan);">${(p.inventory || []).length} صنف</td>
      <td>
        <button class="btn-primary" style="padding:4px 8px; font-size:11px;" onclick="selectPharmacyForInventory('${p.id}')">💊 المخزون والأدوية</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function selectPharmacyForInventory(pharmacyId) {
  const ph = pharmaciesData.find(p => p.id === pharmacyId);
  if (!ph) return;

  selectedPharmacy = ph;
  document.getElementById("inventory-pharmacy-title").innerHTML = `💊 قائمة مخزون الأدوية المتوفرة لدى: <strong style="color:var(--color-gold);">${ph.name}</strong> (د. ${ph.manager})`;
  
  renderPharmacyInventoryRows(ph);
  document.getElementById("pharmacy-inventory-details-card").style.display = "block";
}

function renderPharmacyInventoryRows(ph) {
  const tbody = document.getElementById("pharmacy-inventory-rows");
  tbody.innerHTML = "";

  if (!ph.inventory || ph.inventory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">لا يوجد أدوية مسجلة بمخزون هذا المكتب حالياً</td></tr>`;
    return;
  }

  ph.inventory.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight:bold; color:var(--accent-cyan);">${item.tradeName}</td>
      <td>${item.activeIngredient}</td>
      <td>${item.concentration}</td>
      <td>${item.use || "-"}</td>
      <td style="text-align:center;">
        <button class="btn-danger" style="padding:4px 8px; font-size:11px; border-radius:4px;" onclick="deleteDrugFromPharmacy(${index})">🗑️ حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ====================================================
// استمارة الكشف والروشتة الذكية وتنبيهات المخزون
// ====================================================

// البحث عن مربي في استمارة الكشف وتعبئته تلقائياً
function handleFormBreederSearch(query) {
  const dropdown = document.getElementById("form-breeder-results-dropdown");
  if (!query.trim()) {
    dropdown.style.display = "none";
    return;
  }

  const normQuery = normalizeArabic(query);
  const matches = breedersData.filter(b => normalizeArabic(b.name).includes(normQuery) || normalizeArabic(b.phone).includes(normQuery));

  if (matches.length === 0) {
    dropdown.innerHTML = `<div style="padding:10px; text-align:center; color:var(--text-muted); font-size:11px;">مربي جديد بالكامل (سيتم تسجيله تلقائياً)</div>`;
    dropdown.style.display = "block";
    return;
  }

  dropdown.innerHTML = "";
  matches.slice(0, 4).forEach(b => {
    const item = document.createElement("div");
    item.className = "form-breeder-item";
    item.textContent = `${b.name} (📱 ${b.phone})`;
    item.style.cssText = "padding:10px; cursor:pointer; font-size:12px; border-bottom:1px solid var(--border-color);";
    item.onclick = () => selectBreederForForm(b);
    dropdown.appendChild(item);
  });
  dropdown.style.display = "block";
}

function selectBreederForForm(breeder) {
  document.getElementById("form-breeder-results-dropdown").style.display = "none";
  
  document.getElementById("visit-breeder-name").value = breeder.name;
  document.getElementById("visit-breeder-name").dataset.breederId = breeder.id;
  document.getElementById("visit-breeder-phone").value = breeder.phone;
  document.getElementById("visit-breeder-address").value = breeder.address;
  document.getElementById("visit-vaccinations").value = breeder.vaccinations || "";
  
  // ملء العنابر الخاصة بالمربي المختار
  const farmSelect = document.getElementById("visit-farm-select");
  farmSelect.innerHTML = '<option value="">-- اختر عنبر الكشف --</option>';
  
  if (breeder.farms && breeder.farms.length > 0) {
    breeder.farms.forEach(f => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = `${f.name} (${f.type} - سلالة: ${f.breed || 'عام'} - سعة: ${f.capacity.toLocaleString()})`;
      farmSelect.appendChild(opt);
    });
    // اختيار العنبر الأول افتراضياً
    farmSelect.value = breeder.farms[0].id;
    handleVisitFarmSelect(breeder.farms[0].id);
  } else {
    farmSelect.innerHTML = '<option value="">لا يوجد عنابر مسجلة للمربي، سيتم حفظ هذا الكشف كعنبر افتراضي</option>';
  }

  // تنبيه وبائيات المنطقة
  checkRegionOutbreaks(breeder.address);

  // الكشف وتنبيه مخزون الأدوية للصيدلية البيطرية المفضلة
  const alertBox = document.getElementById("visit-preferred-pharmacy-alert");
  if (breeder.preferredPharmacyId) {
    const ph = pharmaciesData.find(p => p.id === breeder.preferredPharmacyId);
    if (ph) {
      alertBox.innerHTML = `🏢 <strong>مكتب الأدوية المعتمد للمربي:</strong> <span style="color:var(--color-gold); font-weight:bold;">${ph.name}</span> (د. ${ph.manager} - 📱 ${ph.phone})<br><span style="color:var(--color-success);">* سيقوم النظام تلقائياً بتظليل الأدوية المتوفرة لدى هذا المكتب باللون الأخضر في الروشتة لمساعدتك.</span>`;
      alertBox.style.display = "block";
    } else {
      alertBox.style.display = "none";
    }
  } else {
    alertBox.style.display = "none";
  }

  // إعادة رندرة الروشتة الحالية لتظليل أدوية المكتب
  updateRxBuilderStockHighlights();

  showToast(`تم استيراد بيانات العميل "${breeder.name}" للفورم بنجاح`, "success");
}

function handleVisitFarmSelect(farmId) {
  if (!farmId) return;
  const breederId = document.getElementById("visit-breeder-name").dataset.breederId;
  if (!breederId) return;
  
  const breeder = breedersData.find(b => b.id === breederId);
  if (!breeder) return;

  const farm = breeder.farms.find(f => f.id === farmId);
  if (farm) {
    document.getElementById("visit-bird-type").value = farm.type || "تسمين";
    document.getElementById("visit-breed").value = farm.breed || "";
    document.getElementById("visit-hatchery").value = farm.hatchery || "";
    document.getElementById("visit-capacity").value = farm.capacity || 0;
    
    // محاولة تخمين الدورة الأخيرة أو توليد اسم تلقائي
    document.getElementById("visit-cycle").value = breeder.visits && breeder.visits[0] ? breeder.visits[0].cycle : "الدورة الحالية";
  }
}

// إدارة منشئ الروشتة الذكي
function resetPrescriptionBuilder() {
  document.getElementById("rx-builder-rows").innerHTML = "";
  addRxBuilderRow();
}

function addRxBuilderRow(medName = "", dose = "", duration = "", activeIng = "") {
  const tbody = document.getElementById("rx-builder-rows");
  const row = document.createElement("tr");

  // كتالوج الأدوية
  const catalog = window.MEDICINE_CATALOG || {};
  if (!document.getElementById("meds-datalist")) {
    let datalistHtml = `<datalist id="meds-datalist">`;
    Object.keys(catalog).forEach(name => {
      datalistHtml += `<option value="${name}">`;
    });
    datalistHtml += `</datalist>`;
    document.body.insertAdjacentHTML('beforeend', datalistHtml);
  }

  row.innerHTML = `
    <td>
      <input type="text" class="rx-med-name-input" list="meds-datalist" value="${medName}" placeholder="اكتب اسم العلاج التجاري..." required onchange="handleMedChange(this)">
    </td>
    <td>
      <input type="text" class="rx-med-active-input" value="${activeIng}" placeholder="المادة الفعالة والتركيز..." readonly style="background:rgba(255,255,255,0.01);">
    </td>
    <td>
      <input type="text" class="rx-med-dose-input" value="${dose}" placeholder="الجرعة وطريقة الصرف..." required>
    </td>
    <td style="text-align: center;">
      <button type="button" class="rx-remove-btn" onclick="removeRxBuilderRow(this)">🗑️</button>
    </td>
  `;
  tbody.appendChild(row);

  // تحديث التظليل لصفوف المخزون
  updateRxBuilderStockHighlights();
}

function removeRxBuilderRow(btn) {
  const tbody = document.getElementById("rx-builder-rows");
  if (tbody.rows.length > 1) {
    btn.closest("tr").remove();
  } else {
    showToast("يجب أن تضم الروشتة علاجاً واحداً على الأقل!", "warning");
  }
}

function handleMedChange(input) {
  const row = input.closest("tr");
  const medName = input.value.trim();
  const catalog = window.MEDICINE_CATALOG || {};

  const activeInput = row.querySelector(".rx-med-active-input");
  const doseInput = row.querySelector(".rx-med-dose-input");

  if (catalog[medName]) {
    activeInput.value = `${catalog[medName].activeIngredient} (${catalog[medName].concentration})`;
    doseInput.value = `${catalog[medName].doseDefault} - لمدة ${catalog[medName].withdrawalDays} أيام فتره أمان`;
  }

  updateRxBuilderStockHighlights();
}

// تظليل الأدوية المتوفرة لدى مكتب الأدوية المفضل للمربي المختار باللون الأخضر
function updateRxBuilderStockHighlights() {
  const breederId = document.getElementById("visit-breeder-name").dataset.breederId;
  if (!breederId) return;

  const breeder = breedersData.find(b => b.id === breederId);
  if (!breeder || !breeder.preferredPharmacyId) return;

  const ph = pharmaciesData.find(p => p.id === breeder.preferredPharmacyId);
  if (!ph || !ph.inventory) return;

  const rows = document.querySelectorAll("#rx-builder-rows tr");
  rows.forEach(row => {
    const medInput = row.querySelector(".rx-med-name-input");
    if (!medInput) return;
    const medName = medInput.value.trim();

    // البحث في مخزون الصيدلية المفضلة بالاسم التجاري
    const isAvailable = ph.inventory.some(item => normalizeArabic(item.tradeName) === normalizeArabic(medName));
    if (isAvailable && medName) {
      row.classList.add("stock-available-row");
      // وضع تلميح أو علامة توفر
      medInput.title = "هذا الصنف متوفر حالياً بمخزون الصيدلية المعتمدة للمربي";
    } else {
      row.classList.remove("stock-available-row");
    }
  });
}

// البحث عن أدوية بديلة بالمادة الفعالة
function searchAlternativeMedicine(query) {
  const container = document.getElementById("alternative-meds-suggestions");
  if (!query.trim()) {
    container.style.display = "none";
    return;
  }

  const normQuery = normalizeArabic(query);
  const catalog = window.MEDICINE_CATALOG || {};
  const matches = [];

  Object.entries(catalog).forEach(([tradeName, details]) => {
    if (normalizeArabic(details.activeIngredient).includes(normQuery) || normalizeArabic(tradeName).includes(normQuery)) {
      matches.push({
        tradeName: tradeName,
        activeIngredient: details.activeIngredient,
        concentration: details.concentration,
        doseDefault: details.doseDefault
      });
    }
  });

  if (matches.length === 0) {
    container.innerHTML = `<div style="font-size:11px; color:var(--text-muted); padding:5px;">لا يوجد بدائل مطابقة للمادة الفعالة</div>`;
    container.style.display = "block";
    return;
  }

  // معرف المربي
  const breederId = document.getElementById("visit-breeder-name").dataset.breederId;
  const breeder = breedersData.find(b => b.id === breederId);
  const ph = breeder ? pharmaciesData.find(p => p.id === breeder.preferredPharmacyId) : null;

  container.innerHTML = "<div style='font-size:11px; color:var(--accent-cyan); font-weight:bold; margin-bottom:5px;'>💡 الأدوية البديلة المطابقة للمادة الفعالة:</div>";
  matches.slice(0, 4).forEach(m => {
    // التحقق من توافر البديل في صيدليته المفضلة
    const isAvailable = ph ? ph.inventory.some(item => normalizeArabic(item.tradeName) === normalizeArabic(m.tradeName)) : false;
    const itemDiv = document.createElement("div");
    itemDiv.className = "alt-med-item";
    itemDiv.innerHTML = `
      <span>💊 <strong>${m.tradeName}</strong> (${m.activeIngredient}) - ${isAvailable ? '<span style="color:var(--color-success); font-weight:bold;">متوفر بالمكتب</span>' : '<span style="color:var(--text-muted);">غير متوفر</span>'}</span>
      <button type="button" class="add-btn">➕ إدراج</button>
    `;
    itemDiv.querySelector(".add-btn").onclick = () => {
      // إلحاق الصنف بصف جديد بالروشتة
      addRxBuilderRow(m.tradeName, m.doseDefault, "12 ساعة يومياً لمدة 5 أيام", `${m.activeIngredient} (${m.concentration})`);
      container.style.display = "none";
      document.getElementById("active-ingredient-search").value = "";
    };
    container.appendChild(itemDiv);
  });
  container.style.display = "block";
}

// تطبيق قوالب التشخيص الجاهزة للسرعة الفائقة
function applyPrescriptionTemplate(tempKey) {
  const templates = window.PRESCRIPTION_TEMPLATES || {};
  const temp = templates[tempKey];
  if (!temp) return;

  document.getElementById("visit-final-diagnosis").value = temp.diagnosis;
  document.getElementById("visit-general-notes").value = temp.notes;

  // إخلاء البيلدر وبنائه بالقالب
  document.getElementById("rx-builder-rows").innerHTML = "";
  temp.prescriptions.forEach(p => {
    addRxBuilderRow(p.name, p.dose, p.duration, p.activeIngredient || "");
  });

  showToast(`تم تطبيق قالب "${temp.name}" بنجاح`, "success");
}

// احتساب مديونيات الكشف والمدفوع والآجل للفورم تلقائياً
function calculateVisitFinancials() {
  const cost = parseFloat(document.getElementById("visit-cost").value) || 0;
  const paid = parseFloat(document.getElementById("visit-paid").value) || 0;
  const debt = Math.max(0, cost - paid);
  document.getElementById("visit-debt-amount").value = debt;
}

// دالة تفريغ استمارة الكشف
function resetVisitForm() {
  document.getElementById("new-visit-form").reset();
  delete document.getElementById("visit-breeder-name").dataset.breederId;
  document.getElementById("visit-farm-select").innerHTML = '<option value="">-- يرجى اختيار العميل أولاً --</option>';
  document.getElementById("visit-preferred-pharmacy-alert").style.display = "none";
  document.getElementById("form-epidemic-warning-box").style.display = "none";
  resetPrescriptionBuilder();
  calculateMortalityPercent();
}

// معالجة وحفظ زيارة كشف وتشريح جديدة
function handleSaveVisit(event) {
  event.preventDefault();

  const breederName = document.getElementById("visit-breeder-name").value.trim();
  const phone = document.getElementById("visit-breeder-phone").value.trim();
  const address = document.getElementById("visit-breeder-address").value.trim();
  const farmId = document.getElementById("visit-farm-select").value;
  const cycle = document.getElementById("visit-cycle").value.trim();

  const birdType = document.getElementById("visit-bird-type").value;
  const breed = document.getElementById("visit-breed").value.trim();
  const hatchery = document.getElementById("visit-hatchery").value.trim();
  const capacity = parseInt(document.getElementById("visit-capacity").value) || 0;
  
  const age = document.getElementById("visit-age").value.trim();
  const temp = parseFloat(document.getElementById("visit-temperature").value) || 0;
  const sampleDate = document.getElementById("visit-last-sample-date").value;

  const todayMort = parseInt(document.getElementById("mortality-today").value) || 0;
  const yestMort = parseInt(document.getElementById("mortality-yesterday").value) || 0;
  const dayBeforeMort = parseInt(document.getElementById("mortality-day-before").value) || 0;

  const symptoms = document.getElementById("visit-symptoms").value.trim();
  const medicinesLast5Days = document.getElementById("visit-past-meds").value.trim();
  const diffDiagnosis = document.getElementById("visit-diff-diagnosis").value.trim();
  const finalDiagnosis = document.getElementById("visit-final-diagnosis").value.trim();
  const generalNotes = document.getElementById("visit-general-notes").value.trim();

  // الماليات
  const cost = parseFloat(document.getElementById("visit-cost").value) || 0;
  const paid = parseFloat(document.getElementById("visit-paid").value) || 0;
  const debtAmount = cost - paid;

  // استخراج الأدوية المكتوبة
  const rows = document.querySelectorAll("#rx-builder-rows tr");
  const prescriptions = [];
  rows.forEach(r => {
    const medName = r.querySelector(".rx-med-name-input").value.trim();
    const activeIng = r.querySelector(".rx-med-active-input").value.trim();
    const dose = r.querySelector(".rx-med-dose-input").value.trim();

    if (medName) {
      prescriptions.push({
        name: medName,
        activeIngredient: activeIng,
        dose: dose
      });
    }
  });

  if (prescriptions.length === 0) {
    showToast("يرجى إدراج دواء واحد على الأقل للروشتة المعتمدة!", "warning");
    return;
  }

  // الفحوصات المعملية
  const labTests = {
    pcr: document.getElementById("lab-pcr").checked,
    pcrDetails: document.getElementById("lab-pcr").checked ? document.getElementById("lab-pcr-details").value.trim() : "",
    elisa: document.getElementById("lab-elisa").checked,
    elisaDetails: document.getElementById("lab-elisa").checked ? document.getElementById("lab-elisa-details").value.trim() : "",
    sensitivity: document.getElementById("lab-sensitivity").checked,
    sensitivityDetails: document.getElementById("lab-sensitivity").checked ? document.getElementById("lab-sensitivity-details").value.trim() : "",
    immunity: document.getElementById("lab-immunity").checked,
    immunityDetails: document.getElementById("lab-immunity").checked ? document.getElementById("lab-immunity-details").value.trim() : ""
  };

  // التحقق من ربط العميل
  let breederId = document.getElementById("visit-breeder-name").dataset.breederId;
  let breederObj = null;

  if (breederId) {
    breederObj = breedersData.find(b => b.id === breederId);
  }

  if (!breederObj) {
    // إنشاء عميل ومزرعة جديدة تلقائياً إذا لم يكن مسجلاً
    breederId = "breeder_" + Date.now();
    const newFarmId = "farm_" + Date.now();
    
    breederObj = {
      id: breederId,
      name: breederName,
      phone: phone,
      address: address,
      preferredPharmacyId: "",
      financialStatus: {
        hasDebt: debtAmount > 0,
        debtAmount: debtAmount,
        notes: debtAmount > 0 ? "مديونية كشف التأسيس الأول" : "خالص"
      },
      farms: [
        {
          id: newFarmId,
          name: "عنبر افتراضي 1",
          type: birdType,
          breed: breed,
          hatchery: hatchery,
          capacity: capacity,
          status: "نشط",
          vaccinations: []
        }
      ],
      visits: []
    };
    breedersData.push(breederObj);
  } else {
    // عميل قائم: تحديث مزارعه ونظامه المالي التراكمي
    const oldDebt = breederObj.financialStatus ? breederObj.financialStatus.debtAmount : 0;
    const totalDebt = oldDebt + debtAmount;
    breederObj.financialStatus = {
      hasDebt: totalDebt > 0,
      debtAmount: totalDebt,
      notes: totalDebt > 0 ? `تراكم مديونيات شامل كشف ${sampleDate}` : "خالص"
    };

    // التحقق من العنبر المختار أو إنشائه إن لم يتوفر
    let farmObj = breederObj.farms.find(f => f.id === farmId);
    if (!farmObj) {
      const newFarmId = "farm_" + Date.now();
      farmObj = {
        id: newFarmId,
        name: "عنبر جديد",
        type: birdType,
        breed: breed,
        hatchery: hatchery,
        capacity: capacity,
        status: "نشط",
        vaccinations: []
      };
      breederObj.farms.push(farmObj);
    }
  }

  // صياغة الكشف وحفظه
  const visitId = "v_" + Date.now();
  const visitObj = {
    id: visitId,
    breederId: breederId,
    farmId: farmId || (breederObj.farms && breederObj.farms[0] ? breederObj.farms[0].id : ""),
    date: sampleDate,
    age: age,
    cycle: cycle,
    cost: cost,
    paid: paid,
    debt: debtAmount,
    mortality: { today: todayMort, yesterday: yestMort, dayBefore: dayBeforeMort },
    temperature: temp,
    symptoms: symptoms,
    medicinesLast5Days: medicinesLast5Days,
    differentialDiagnosis: diffDiagnosis,
    finalDiagnosis: finalDiagnosis,
    prescriptions: prescriptions,
    labTests: labTests,
    generalNotes: generalNotes
  };

  breederObj.visits.unshift(visitObj);
  saveDataToLocal();
  showToast("تم حفظ الكشف والتشخيص الطبي بنجاح محلياً", "success");

  // طباعة مباشرة للروشتة
  printDirectPrescription(breederObj, visitObj);

  // رفع البيانات لجوجل شيت إذا كانت المزامنة مفعلة
  if (syncSettings.syncMode === "cloud" && syncSettings.appsScriptUrl) {
    uploadVisitToCloud(breederObj, visitObj);
  }

  // فتح التبويب وعرض ملف العميل فوراً
  selectBreederFromSearch(breederId);
  resetVisitForm();
}

function calculateMortalityPercent() {
  const cap = parseInt(document.getElementById("visit-capacity").value) || 0;
  const today = parseInt(document.getElementById("mortality-today").value) || 0;
  const yest = parseInt(document.getElementById("mortality-yesterday").value) || 0;
  const before = parseInt(document.getElementById("mortality-day-before").value) || 0;

  const totalMort = today + yest + before;
  const badge = document.getElementById("mortality-percent-badge");
  const text = document.getElementById("mortality-trend-text");

  if (!badge) return;

  if (cap > 0 && totalMort > 0) {
    const percent = ((totalMort / cap) * 100).toFixed(2);
    badge.textContent = `${percent}% نفوق`;
    
    // قياس المؤشر للتنبيه
    if (today > yest && yest > before) {
      badge.className = "mortality-badge danger";
      text.innerHTML = "🚨 النفوق يتصاعد بشكل خطير!";
    } else {
      badge.className = "mortality-badge warning";
      text.innerHTML = "📉 مؤشر النفوق تحت المراقبة";
    }
  } else {
    badge.textContent = "0% نفوق";
    badge.className = "mortality-badge warning";
    text.textContent = "أدخل الأعداد للتحليل";
  }
}

// ====================================================
// الحسابات والتحصيلات ودفتر القيود (Financial Accounts)
// ====================================================
function renderFinancialAccounts(selectedDate) {
  const tbody = document.getElementById("accounts-ledger-rows");
  if (!tbody) return;
  tbody.innerHTML = "";

  let totalCost = 0;
  let totalPaid = 0;
  let totalDebt = 0;
  let ledgerCount = 0;

  breedersData.forEach(b => {
    (b.visits || []).forEach(v => {
      if (v.date === selectedDate) {
        ledgerCount++;
        const cost = v.cost || 0;
        const paid = v.paid || 0;
        const debt = v.debt || 0;

        totalCost += cost;
        totalPaid += paid;
        totalDebt += debt;

        const farmObj = b.farms.find(f => f.id === v.farmId) || {};

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="font-weight:700; color:var(--accent-cyan);">${b.name}</td>
          <td>${farmObj.name || "-"}</td>
          <td>📅 ${v.date}</td>
          <td>${cost.toLocaleString()} ج.م</td>
          <td style="color:var(--color-success); font-weight:bold;">${paid.toLocaleString()} ج.م</td>
          <td style="color:${debt > 0 ? 'var(--color-danger)' : 'var(--color-success)'}; font-weight:bold;">${debt > 0 ? debt.toLocaleString() + ' ج.م' : 'خالص'}</td>
          <td>
            <button class="btn-secondary-outline" style="padding:4px 8px; font-size:11px;" onclick="selectBreederFromSearch('${b.id}')">🔍 ملف العميل</button>
          </td>
        `;
        tbody.appendChild(tr);
      }
    });
  });

  if (ledgerCount === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">لا يوجد كشوفات أو معاملات مالية مسجلة في هذا اليوم</td></tr>`;
  }

  document.getElementById("accounts-total-sales").textContent = `${ledgerCount} كشف`;
  document.getElementById("accounts-total-paid").textContent = `${totalPaid.toLocaleString()} ج.م`;
  document.getElementById("accounts-total-debts").textContent = `${totalDebt.toLocaleString()} ج.م`;
}

// طباعة التقرير المالي اليومي
function printDailyFinancialReport() {
  const date = document.getElementById("accounts-date-picker").value;
  if (!date) return;

  let rowsHtml = "";
  let totalCost = 0;
  let totalPaid = 0;
  let totalDebt = 0;

  breedersData.forEach(b => {
    (b.visits || []).forEach(v => {
      if (v.date === date) {
        const cost = v.cost || 0;
        const paid = v.paid || 0;
        const debt = v.debt || 0;

        totalCost += cost;
        totalPaid += paid;
        totalDebt += debt;

        const farmObj = b.farms.find(f => f.id === v.farmId) || {};

        rowsHtml += `
          <tr>
            <td style="padding:8px; border:1px solid #000;">${b.name}</td>
            <td style="padding:8px; border:1px solid #000;">${farmObj.name || "-"}</td>
            <td style="padding:8px; border:1px solid #000; text-align:center;">${cost.toLocaleString()} ج.م</td>
            <td style="padding:8px; border:1px solid #000; text-align:center; color:green;">${paid.toLocaleString()} ج.م</td>
            <td style="padding:8px; border:1px solid #000; text-align:center; color:${debt > 0 ? 'red' : 'green'}; font-weight:bold;">${debt > 0 ? debt.toLocaleString() + ' ج.م' : 'خالص'}</td>
          </tr>
        `;
      }
    });
  });

  if (!rowsHtml) {
    showToast("لا يوجد كشوفات مالية لطباعتها في هذا اليوم!", "warning");
    return;
  }

  const w = window.open("", "_blank");
  w.document.write(`
    <html lang="ar" dir="rtl">
    <head>
      <title>التقرير المالي اليومي لعيادة الدواجن</title>
      <style>
        body { font-family: 'Cairo', sans-serif; padding: 20px; direction: rtl; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px; border: 1px solid #000; font-size:12px; text-align:right; }
        th { background: #f2f2f2; }
      </style>
    </head>
    <body>
      <h2>معمل دكتورة نجلاء لتشخيص أمراض الدواجن</h2>
      <h3>تقرير المعاملات الاستشارية والتحصيلات</h3>
      <p>تاريخ اليوم المالي: <strong>${date}</strong></p>
      <table>
        <thead>
          <tr>
            <th>اسم العميل</th>
            <th>العنبر</th>
            <th>قيمة الكشف</th>
            <th>المبلغ المدفوع</th>
            <th>الآجل المتبقي</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="margin-top:20px; background:#f9f9f9; padding:15px; border:1px solid #000; display:flex; justify-content:space-between; font-weight:bold;">
        <span>إجمالي الفواتير: ${totalCost.toLocaleString()} ج.م</span>
        <span style="color:green;">إجمالي المحصل: ${totalPaid.toLocaleString()} ج.م</span>
        <span style="color:red;">إجمالي الديون: ${totalDebt.toLocaleString()} ج.م</span>
      </div>
      <script>window.onload = function() { window.print(); window.close(); }</script>
    </body>
    </html>
  `);
  w.document.close();
}

// ====================================================
// النوافذ المنبثقة والتحكم بالبيانات (Modals Logic)
// ====================================================

// 1. مودال إضافة عميل
function openAddBreederModal() {
  const select = document.getElementById("modal-breeder-pharmacy-select");
  select.innerHTML = '<option value="">-- لا يوجد مكتب أدوية معتمد --</option>';
  pharmaciesData.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });
  document.getElementById("add-breeder-modal").classList.add("active");
}
function closeAddBreederModal() {
  document.getElementById("add-breeder-modal").classList.remove("active");
}
function handleAddBreederSubmit() {
  const name = document.getElementById("modal-breeder-name-input").value.trim();
  const phone = document.getElementById("modal-breeder-phone-input").value.trim();
  const address = document.getElementById("modal-breeder-address-input").value.trim();
  const preferredPharmacyId = document.getElementById("modal-breeder-pharmacy-select").value;

  if (!name || !phone || !address) {
    showToast("يرجى ملء كافة الحقول الإجبارية للعضوية!", "warning");
    return;
  }

  const newBreeder = {
    id: "breeder_" + Date.now(),
    name: name,
    phone: phone,
    address: address,
    preferredPharmacyId: preferredPharmacyId,
    farms: [],
    visits: [],
    financialStatus: { hasDebt: false, debtAmount: 0, notes: "" }
  };

  breedersData.unshift(newBreeder);
  saveDataToLocal();
  closeAddBreederModal();
  showToast("تم تسجيل العميل الجديد بنجاح", "success");
}

// 2. مودال إضافة عنبر
function openAddFarmModal() {
  const select = document.getElementById("modal-farm-breeder-select");
  select.innerHTML = '<option value="">-- اختر المالك --</option>';
  breedersData.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.name;
    select.appendChild(opt);
  });
  document.getElementById("add-farm-modal").classList.add("active");
}
function closeAddFarmModal() {
  document.getElementById("add-farm-modal").classList.remove("active");
}
function handleAddFarmSubmit() {
  const breederId = document.getElementById("modal-farm-breeder-select").value;
  const name = document.getElementById("modal-farm-name-input").value.trim();
  const type = document.getElementById("modal-farm-type-select").value;
  const breed = document.getElementById("modal-farm-breed-input").value.trim();
  const hatchery = document.getElementById("modal-farm-hatchery-input").value.trim();
  const capacity = parseInt(document.getElementById("modal-farm-capacity-input").value) || 0;
  const status = document.getElementById("modal-farm-status-select").value;

  if (!breederId || !name || !capacity) {
    showToast("برجاء إدخال اسم المربي والعنبر والسعة العددية للتشغيل!", "warning");
    return;
  }

  const breeder = breedersData.find(b => b.id === breederId);
  if (breeder) {
    const newFarm = {
      id: "farm_" + Date.now(),
      name: name,
      type: type,
      breed: breed,
      hatchery: hatchery,
      capacity: capacity,
      status: status,
      vaccinations: []
    };
    if (!breeder.farms) breeder.farms = [];
    breeder.farms.push(newFarm);
    saveDataToLocal();
    closeAddFarmModal();
    showToast("تم تسجيل وإلحاق العنبر الجديد بنجاح", "success");
  }
}

// 3. مودال إضافة مكتب أدوية
function openAddPharmacyModal() {
  document.getElementById("add-pharmacy-modal").classList.add("active");
}
function closeAddPharmacyModal() {
  document.getElementById("add-pharmacy-modal").classList.remove("active");
}
function handleAddPharmacySubmit() {
  const name = document.getElementById("modal-ph-name-input").value.trim();
  const manager = document.getElementById("modal-ph-manager-input").value.trim();
  const phone = document.getElementById("modal-ph-phone-input").value.trim();
  const address = document.getElementById("modal-ph-address-input").value.trim();

  if (!name || !manager || !phone || !address) {
    showToast("يرجى ملء كافة حقول المكتب الطبي لتسجيله!", "warning");
    return;
  }

  const newPharmacy = {
    id: "pharmacy_" + Date.now(),
    name: name,
    manager: manager,
    phone: phone,
    address: address,
    inventory: []
  };

  pharmaciesData.unshift(newPharmacy);
  saveDataToLocal();
  closeAddPharmacyModal();
  showToast("تم تسجيل مكتب الأدوية الجديد بنجاح", "success");
}

// 4. مودال إضافة دواء لمخزن مكتب أدوية
function openAddDrugToPharmacyModal() {
  if (!selectedPharmacy) {
    showToast("يرجى تحديد مكتب أدوية أولاً لإضافة الدواء إليه!", "warning");
    return;
  }
  document.getElementById("add-drug-modal").classList.add("active");
}
function closeAddDrugToPharmacyModal() {
  document.getElementById("add-drug-modal").classList.remove("active");
}
function handleAddDrugToPharmacySubmit() {
  const trade = document.getElementById("modal-dr-trade-input").value.trim();
  const active = document.getElementById("modal-dr-active-input").value.trim();
  const conc = document.getElementById("modal-dr-concentration-input").value.trim();
  const use = document.getElementById("modal-dr-use-input").value.trim();

  if (!trade || !active || !conc) {
    showToast("يرجى إدخال الاسم التجاري والمادة الفعالة والتركيز!", "warning");
    return;
  }

  const newDrug = {
    tradeName: trade,
    activeIngredient: active,
    concentration: conc,
    use: use
  };

  if (!selectedPharmacy.inventory) selectedPharmacy.inventory = [];
  selectedPharmacy.inventory.push(newDrug);
  saveDataToLocal();
  closeAddDrugToPharmacyModal();
  selectPharmacyForInventory(selectedPharmacy.id);
  showToast("تم إضافة العلاج الجديد إلى مخزون المكتب بنجاح", "success");
}

function deleteDrugFromPharmacy(index) {
  if (selectedPharmacy && selectedPharmacy.inventory) {
    selectedPharmacy.inventory.splice(index, 1);
    saveDataToLocal();
    selectPharmacyForInventory(selectedPharmacy.id);
    showToast("تم إزالة الدواء من مخزون المكتب بنجاح", "warning");
  }
}

// 5. مودال إضافة تحصين لعنبر
function openAddVaccinationModal() {
  if (!activeFarmForVac) {
    showToast("يرجى اختيار العميل والعنبر أولاً لجداول التحصينات!", "warning");
    return;
  }
  document.getElementById("add-vaccination-modal").classList.add("active");
}
function closeAddVaccinationModal() {
  document.getElementById("add-vaccination-modal").classList.remove("active");
}
function handleAddVaccinationSubmit() {
  const name = document.getElementById("modal-vac-name-input").value.trim();
  const age = document.getElementById("modal-vac-age-input").value.trim();
  const date = document.getElementById("modal-vac-date-input").value;
  const status = document.getElementById("modal-vac-status-select").value;

  if (!name || !age || !date) {
    showToast("يرجى كتابة اسم التحصينة والعمر والتاريخ المقرر!", "warning");
    return;
  }

  const newVac = {
    name: name,
    age: age,
    date: date,
    status: status
  };

  if (!activeFarmForVac.vaccinations) activeFarmForVac.vaccinations = [];
  activeFarmForVac.vaccinations.push(newVac);
  saveDataToLocal();
  closeAddVaccinationModal();
  loadFarmVaccinations(activeFarmForVac.id);
  showToast("تم إضافة وتدوين التحصينة للعنبر بنجاح", "success");
}

function deleteVaccination(index) {
  if (activeFarmForVac && activeFarmForVac.vaccinations) {
    activeFarmForVac.vaccinations.splice(index, 1);
    saveDataToLocal();
    loadFarmVaccinations(activeFarmForVac.id);
    showToast("تم حذف التحصين من العنبر بنجاح", "warning");
  }
}

// 6. تسوية حساب مديونية عميل بيطري
function openSettleDebtModal() {
  if (!selectedBreeder) {
    showToast("يرجى تحديد عميل للقيام بالتسوية المالية المباشرة له!", "warning");
    return;
  }
  const modal = document.getElementById("settle-debt-modal");
  document.getElementById("modal-breeder-name").value = selectedBreeder.name;
  const currentDebt = selectedBreeder.financialStatus ? selectedBreeder.financialStatus.debtAmount : 0;
  document.getElementById("modal-current-debt").value = `${currentDebt.toLocaleString()} ج.م`;
  document.getElementById("modal-payment-amount").value = "";
  modal.classList.add("active");
}
function closeSettleDebtModal() {
  document.getElementById("settle-debt-modal").classList.remove("active");
}
function handleSettleDebtSubmit() {
  const paymentAmount = parseFloat(document.getElementById("modal-payment-amount").value) || 0;
  const currentDebt = selectedBreeder.financialStatus ? selectedBreeder.financialStatus.debtAmount : 0;

  if (paymentAmount <= 0) {
    showToast("يرجى إدخال مبلغ مسدد أكبر من الصفر للتأكيد المالي!", "warning");
    return;
  }

  const finalDebt = Math.max(0, currentDebt - paymentAmount);
  selectedBreeder.financialStatus = {
    hasDebt: finalDebt > 0,
    debtAmount: finalDebt,
    notes: finalDebt > 0 ? `سداد جزئي بقيمة ${paymentAmount} ج.م` : "الحساب خالص تماماً"
  };

  saveDataToLocal();
  closeSettleDebtModal();
  showToast(`تم إقرار السداد بنجاح وجاري المزامنة. المتبقي: ${finalDebt.toLocaleString()} ج.م`, "success");

  if (syncSettings.syncMode === "cloud" && syncSettings.appsScriptUrl) {
    uploadDebtSettleToCloud(selectedBreeder.id, finalDebt);
  }
}

// ====================================================
// تدوير وتعبئة عناصر الـ Dropdowns في شاشات الإدخال
// ====================================================
function populateDropdowns() {
  // 1. العملاء في شاشة التحصينات
  const vacBreederSelect = document.getElementById("vac-breeder-select");
  if (vacBreederSelect) {
    const val = vacBreederSelect.value;
    vacBreederSelect.innerHTML = '<option value="">-- اختر المربي --</option>';
    breedersData.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.name;
      vacBreederSelect.appendChild(opt);
    });
    vacBreederSelect.value = val;
  }
}

// ====================================================
// تحذيرات وبائيات الدواجن الجغرافية للمناطق المكتوبة
// ====================================================
function checkRegionOutbreaks(addressText) {
  const warningBox = document.getElementById("form-epidemic-warning-box");
  if (!addressText || addressText.trim().length < 2) {
    warningBox.style.display = "none";
    return;
  }

  // تجزئة الكلمات لتفادي تعقيدات الاختلافات النصية
  const cleanText = normalizeArabic(addressText);
  const words = cleanText.split(/[\s،\-]+/).filter(w => w.length > 2 && w !== "مزرعه" && w !== "الحاج" && w !== "طريق" && w !== "بوار" && w !== "بجوار");

  if (words.length === 0) {
    warningBox.style.display = "none";
    return;
  }

  let diseaseCounts = {};

  breedersData.forEach(b => {
    const bAddressClean = normalizeArabic(b.address || "");
    const isMatch = words.some(word => bAddressClean.includes(word));
    
    if (isMatch && b.visits) {
      b.visits.forEach(v => {
        if (v.finalDiagnosis) {
          diseaseCounts[v.finalDiagnosis] = (diseaseCounts[v.finalDiagnosis] || 0) + 1;
        }
      });
    }
  });

  const sorted = Object.entries(diseaseCounts).sort((a,b) => b[1] - a[1]);

  if (sorted.length > 0) {
    let outbreaksText = sorted.map(item => `<strong>${item[0]}</strong> (${item[1]} حالات)`).join(" ، ");
    warningBox.innerHTML = `⚠️ <strong>تنبيه انتشار وبائي للمنطقة (${addressText}):</strong> سَجل المعمل بالمنطقة مؤخراً: ${outbreaksText}`;
    warningBox.style.display = "block";
  } else {
    warningBox.style.display = "none";
  }
}

function populateEpidemiologyRegionSelector() {
  const selector = document.getElementById("epidemiology-region-selector");
  selector.innerHTML = '<option value="">-- اختر المنطقة --</option>';
  
  let regions = new Set();
  breedersData.forEach(b => {
    if (b.address) {
      const cleaned = b.address.split("،")[0].trim();
      if (cleaned) regions.add(cleaned);
    }
  });

  regions.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    selector.appendChild(opt);
  });

  document.getElementById("region-epidemiology-report").style.display = "none";
}

function renderRegionEpidemiology(regionName) {
  const reportDiv = document.getElementById("region-epidemiology-report");
  const diseaseTbody = document.getElementById("epidemic-disease-rows");
  const recentCasesList = document.getElementById("epidemic-recent-cases-list");

  if (!regionName) {
    reportDiv.style.display = "none";
    return;
  }

  diseaseTbody.innerHTML = "";
  recentCasesList.innerHTML = "";

  const normRegion = normalizeArabic(regionName);
  let diseaseCounts = {};
  let totalCases = 0;
  let recentCases = [];

  breedersData.forEach(b => {
    if (normalizeArabic(b.address).includes(normRegion) && b.visits) {
      b.visits.forEach(v => {
        if (v.finalDiagnosis) {
          diseaseCounts[v.finalDiagnosis] = (diseaseCounts[v.finalDiagnosis] || 0) + 1;
          totalCases++;
          
          const farmObj = b.farms.find(f => f.id === v.farmId) || {};
          recentCases.push({
            breederName: b.name,
            date: v.date,
            diagnosis: v.finalDiagnosis,
            age: v.age,
            farmName: farmObj.name || "عنبر عام"
          });
        }
      });
    }
  });

  if (totalCases === 0) {
    diseaseTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">لا يوجد تسجيلات مرضية لهذه المنطقة بعد</td></tr>`;
    recentCasesList.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:12px;">لا يوجد حالات أخيرة</div>`;
    reportDiv.style.display = "block";
    return;
  }

  const sortedOutbreaks = Object.entries(diseaseCounts).sort((a,b) => b[1] - a[1]);
  sortedOutbreaks.forEach(item => {
    const diseaseName = item[0];
    const count = item[1];
    const percent = ((count / totalCases) * 100).toFixed(1);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="font-weight:bold; color:var(--accent-blue-hover);">${diseaseName}</td>
      <td style="text-align:center;">${count} حالات</td>
      <td style="text-align:center;">${percent}%</td>
    `;
    diseaseTbody.appendChild(row);
  });

  // الحالات الأخيرة بالمنطقة
  recentCases.sort((a, b) => new Date(b.date) - new Date(a.date));
  recentCases.slice(0, 10).forEach(c => {
    const caseDiv = document.createElement("div");
    caseDiv.style.cssText = "background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); padding:8px; border-radius:4px; font-size:11px;";
    caseDiv.innerHTML = `
      <div style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom:2px;">
        <span>👤 ${c.breederName} (${c.farmName})</span>
        <span style="color:var(--accent-cyan);">📅 ${c.date}</span>
      </div>
      <div>التشخيص: <strong>${c.diagnosis}</strong> (عمر: ${c.age})</div>
    `;
    recentCasesList.appendChild(caseDiv);
  });

  reportDiv.style.display = "block";
}

// ====================================================
// منطق تصدير واسترجاع قاعدة البيانات (JSON Backup)
// ====================================================
function exportBackupData() {
  const fullDB = {
    breeders: breedersData,
    pharmacies: pharmaciesData,
    exportedAt: new Date().toISOString()
  };
  const dataStr = JSON.stringify(fullDB, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `معمل_دكتورة_نجلاء_قاعدة_البيانات_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("تم تصدير نسخة احتياطية من قاعدة البيانات بنجاح", "success");
}

function importBackupData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const fullDB = JSON.parse(e.target.result);
      if (fullDB.breeders && fullDB.pharmacies) {
        breedersData = fullDB.breeders;
        pharmaciesData = fullDB.pharmacies;
        saveDataToLocal();
        showToast("تم استيراد قاعدة البيانات الاحتياطية بنجاح وتحديث النظام", "success");
      } else {
        showToast("ملف النسخة الاحتياطية غير متوافق مع بنية الجيل الثاني للملفات!", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("فشل تحليل محتوى ملف الـ JSON، تأكد من سلامته!", "error");
    }
  };
  reader.readAsText(file);
}

function clearLocalStorageDB() {
  if (confirm("🚨 هل أنت متأكد تماماً من رغبتك في حذف قاعدة بيانات المربين ومكاتب الأدوية بالكامل وتصفير التطبيق؟")) {
    localStorage.removeItem("poultry_breeders_db_v2");
    localStorage.removeItem("poultry_pharmacies_db_v2");
    initDatabase();
    saveDataToLocal();
    showToast("تم تصفير قاعدة البيانات وإعادتها للافتراضيات البيولوجية", "warning");
  }
}

// ====================================================
// قوالب الطباعة التفاعلية المباشرة (Rx Template)
// ====================================================
function printDirectPrescription(breeder, visit) {
  const printContainer = document.getElementById("print-rx-template");
  if (!printContainer) return;

  const farmObj = breeder.farms.find(f => f.id === visit.farmId) || {};
  const phObj = pharmaciesData.find(p => p.id === breeder.preferredPharmacyId);

  // صياغة الأدوية
  let prescriptionsHtml = "";
  visit.prescriptions.forEach((p, index) => {
    prescriptionsHtml += `
      <tr>
        <td style="padding:6px; border:1px solid #000; text-align:center;">${index + 1}</td>
        <td style="padding:6px; border:1px solid #000; font-weight:bold;">${p.name}</td>
        <td style="padding:6px; border:1px solid #000;">${p.activeIngredient || "-"}</td>
        <td style="padding:6px; border:1px solid #000;">${p.dose}</td>
      </tr>
    `;
  });

  printContainer.innerHTML = `
    <div style="font-family:'Cairo', sans-serif; direction:rtl; text-align:right; padding:10px; color:#000;">
      <!-- الترويسة الطبية المعتمدة للمعمل -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:12px;">
        <div>
          <h2 style="margin:0; font-size:16px; color:#c00;">معمل دكتورة نجلاء لتشخيص أمراض الدواجن</h2>
          <span style="font-size:11px; color:#555;">الاستشارات الفنية والتشريحية وتحاليل المناعات المتقدمة</span>
        </div>
        <div style="text-align:left; font-size:11px;">
          <span>تاريخ التشخيص: <strong>${visit.date}</strong></span><br>
          <span>رقم الكشف: <strong>${visit.id.split('_')[1] || visit.id}</strong></span>
        </div>
      </div>

      <!-- المربي وتوجيه الروشتة للمكتب المفضل -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; margin-bottom:12px; background:#f9f9f9; padding:8px; border:1px solid #ddd; border-radius:4px;">
        <div>اسم المربي: <strong>${breeder.name}</strong></div>
        <div>العنبر: <strong>${farmObj.name || "عنبر عام"}</strong></div>
        <div>نوع الطيور: <strong>${visit.birdType || farmObj.type || "-"} (${visit.breed || farmObj.breed || "-"})</strong></div>
        <div>العمر: <strong>${visit.age}</strong></div>
        <div style="grid-column: 1 / -1; border-top:1px dashed #ccc; padding-top:4px; margin-top:4px;">
          🎯 موجهة إلى مكتب الأدوية: <strong style="color:#c00;">${phObj ? phObj.name + ' (مسؤول: ' + phObj.manager + ')' : 'أي مكتب أدوية معتمد لدى المربي'}</strong>
        </div>
      </div>

      <!-- التشخيص الطبي النهائي -->
      <div style="margin-bottom:12px;">
        <span style="font-size:12px; font-weight:bold; color:#c00;">🎯 التشخيص النهائي المعتمد:</span>
        <div style="font-size:13px; font-weight:bold; background:#fff3f3; padding:6px; border:1px solid #c00; border-radius:4px; margin-top:4px;">
          ${visit.finalDiagnosis}
        </div>
      </div>

      <!-- جدول العلاجات الموصوفة -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:11px;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th style="width:5%; padding:6px; border:1px solid #000;">#</th>
            <th style="width:35%; padding:6px; border:1px solid #000; text-align:right;">اسم العلاج التجاري</th>
            <th style="width:25%; padding:6px; border:1px solid #000; text-align:right;">المادة الفعالة والتركيز</th>
            <th style="width:35%; padding:6px; border:1px solid #000; text-align:right;">الجرعة وطريقة الاستخدام</th>
          </tr>
        </thead>
        <tbody>
          ${prescriptionsHtml}
        </tbody>
      </table>

      <!-- ملاحظات الأمن البيولوجي والتحصينات المحددة -->
      <div style="font-size:11px; margin-bottom:15px; border-top:1px dashed #ccc; padding-top:8px;">
        <strong>📌 توصيات الدكتورة والأمن البيولوجي:</strong>
        <p style="margin:4px 0 0 0; line-height:1.4;">${visit.generalNotes || "ضرورة الاهتمام بالتهوية السليمة والتدفئة وتطهير خطوط النبل."}</p>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:30px; font-size:11px; border-top:1px solid #000; padding-top:8px;">
        <div>توقيع طبيب التشخيص: <strong>د/ نجلاء</strong></div>
        <div style="color:#666;">العنوان: ميت غمر، الدقهلية - هاتف العيادة: 01287654321</div>
      </div>
    </div>
  `;

  // طباعة مباشرة
  window.print();
}

function printSpecificVisitRx(breederId, visitId) {
  const breeder = breedersData.find(b => b.id === breederId);
  if (!breeder) return;
  const visit = breeder.visits.find(v => v.id === visitId);
  if (!visit) return;
  
  printDirectPrescription(breeder, visit);
}

// ====================================================
// نظام المزامنة السحابية المتكامل (Cloud Sync Integration)
// ====================================================
function syncWithGoogleSheets() {
  if (!syncSettings.appsScriptUrl) return;

  updateSyncBadge(false, "جاري سحب البيانات سحابياً...");

  fetch(syncSettings.appsScriptUrl + "?action=getAllData")
    .then(res => res.json())
    .then(data => {
      if (data.breeders && data.pharmacies) {
        breedersData = data.breeders;
        pharmaciesData = data.pharmacies;
        
        localStorage.setItem("poultry_breeders_db_v2", JSON.stringify(breedersData));
        localStorage.setItem("poultry_pharmacies_db_v2", JSON.stringify(pharmaciesData));
        
        renderDashboard();
        renderFarmsTable();
        renderPharmaciesTable();
        populateDropdowns();

        showToast("مزامنة سحابية: تم سحب وتحديث البيانات بنجاح!", "success");
        updateSyncBadge(true);
      }
    })
    .catch(err => {
      console.error(err);
      showToast("فشل الاتصال السحابي بجوجل شيت، تم تفعيل العمل محلياً", "warning");
      updateSyncBadge(false, "خطأ بالاتصال");
    });
}

function uploadVisitToCloud(breeder, visit) {
  if (!syncSettings.appsScriptUrl) return;
  updateSyncBadge(false, "جاري رفع الكشف الطبي...");

  fetch(syncSettings.appsScriptUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "saveVisit",
      breeder: breeder,
      visit: visit
    })
  })
  .then(() => {
    showToast("تم مزامنة الكشف مع Google Sheets سحابياً", "success");
    updateSyncBadge(true);
  })
  .catch(err => {
    console.error(err);
    updateSyncBadge(false, "خطأ بالمزامنة");
  });
}

function uploadDebtSettleToCloud(breederId, debtAmount) {
  if (!syncSettings.appsScriptUrl) return;
  updateSyncBadge(false, "جاري تسوية الحساب سحابياً...");

  fetch(syncSettings.appsScriptUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "settleDebt",
      breederId: breederId,
      debtAmount: debtAmount
    })
  })
  .then(() => {
    showToast("تم مزامنة تسوية المديونية مع الشيت سحابياً", "success");
    updateSyncBadge(true);
  })
  .catch(err => {
    console.error(err);
    updateSyncBadge(false, "خطأ بالمزامنة");
  });
}

function testSheetConnection() {
  if (!syncSettings.appsScriptUrl) {
    showToast("الرجاء إدخال رابط Apps Script Web App API أولاً!", "warning");
    return;
  }
  
  updateSyncBadge(false, "جاري فحص الاتصال...");
  fetch(syncSettings.appsScriptUrl + "?action=testConnection")
    .then(res => res.text())
    .then(text => {
      if (text === "connected") {
        showToast("اتصال ناجح! سكريبت جوجل شيت يستجيب بشكل مثالي", "success");
        updateSyncBadge(true);
      } else {
        showToast("فشل الاتصال: السكريبت أرسل استجابة غير متوافقة", "error");
        updateSyncBadge(false, "فشل الاستجابة");
      }
    })
    .catch(err => {
      console.error(err);
      showToast("تعذر الوصول لـ Web App. تحقق من إعدادات النشر على Apps Script ومصداقية الرابط", "error");
      updateSyncBadge(false, "خطأ بالوصول");
    });
}

function updateSyncBadge(isSuccess, textMsg = "") {
  const badge = document.getElementById("sync-status-badge");
  const text = document.getElementById("sync-status-text");
  if (!badge) return;

  if (isSuccess) {
    badge.className = "sync-badge";
    text.textContent = "تزامن سحابي فوري نشط (جوجل شيت)";
  } else {
    badge.className = "sync-badge sync-error";
    text.textContent = textMsg || "انقطاع الاتصال (التشغيل محلي فقط)";
  }
}

// نظام التنبيهات الطائرة المبسط
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = "✔";
  if (type === "error") icon = "❌";
  if (type === "warning") icon = "⚠️";

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse";
    toast.style.opacity = "0";
    setTimeout(() => { toast.remove(); }, 300);
  }, 4000);
}
