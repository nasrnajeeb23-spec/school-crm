// src/types.ts
var Permission = /* @__PURE__ */ ((Permission2) => {
  Permission2["VIEW_DASHBOARD"] = "VIEW_DASHBOARD";
  Permission2["MANAGE_STUDENTS"] = "MANAGE_STUDENTS";
  Permission2["MANAGE_TEACHERS"] = "MANAGE_TEACHERS";
  Permission2["MANAGE_PARENTS"] = "MANAGE_PARENTS";
  Permission2["MANAGE_CLASSES"] = "MANAGE_CLASSES";
  Permission2["MANAGE_ATTENDANCE"] = "MANAGE_ATTENDANCE";
  Permission2["MANAGE_SCHEDULE"] = "MANAGE_SCHEDULE";
  Permission2["MANAGE_CALENDAR"] = "MANAGE_CALENDAR";
  Permission2["MANAGE_GRADES"] = "MANAGE_GRADES";
  Permission2["MANAGE_MESSAGING"] = "MANAGE_MESSAGING";
  Permission2["MANAGE_FINANCE"] = "MANAGE_FINANCE";
  Permission2["MANAGE_REPORTS"] = "MANAGE_REPORTS";
  Permission2["MANAGE_SETTINGS"] = "MANAGE_SETTINGS";
  Permission2["MANAGE_STAFF"] = "MANAGE_STAFF";
  Permission2["MANAGE_TRANSPORTATION"] = "MANAGE_TRANSPORTATION";
  Permission2["MANAGE_MODULES"] = "MANAGE_MODULES";
  return Permission2;
})(Permission || {});
var ActionItemType = /* @__PURE__ */ ((ActionItemType2) => {
  ActionItemType2["Warning"] = "warning";
  ActionItemType2["Info"] = "info";
  ActionItemType2["Approval"] = "approval";
  ActionItemType2["DriverApplication"] = "driver_application";
  ActionItemType2["PaymentVerification"] = "payment_verification";
  return ActionItemType2;
})(ActionItemType || {});
var ConversationType = /* @__PURE__ */ ((ConversationType2) => {
  ConversationType2["Direct"] = "\u0645\u0628\u0627\u0634\u0631\u0629";
  ConversationType2["Group"] = "\u0645\u062C\u0645\u0648\u0639\u0629";
  ConversationType2["Announcement"] = "\u0625\u0639\u0644\u0627\u0646";
  return ConversationType2;
})(ConversationType || {});
var ActivityType = /* @__PURE__ */ ((ActivityType2) => {
  ActivityType2["NewStudent"] = "\u0637\u0627\u0644\u0628 \u062C\u062F\u064A\u062F";
  ActivityType2["GradeSubmission"] = "\u062A\u0633\u0644\u064A\u0645 \u062F\u0631\u062C\u0627\u062A";
  ActivityType2["NewInvoice"] = "\u0641\u0627\u062A\u0648\u0631\u0629 \u062C\u062F\u064A\u062F\u0629";
  ActivityType2["TeacherOnLeave"] = "\u0645\u0639\u0644\u0645 \u0641\u064A \u0625\u062C\u0627\u0632\u0629";
  return ActivityType2;
})(ActivityType || {});
var RequestType = /* @__PURE__ */ ((RequestType2) => {
  RequestType2["Leave"] = "\u0637\u0644\u0628 \u0625\u062C\u0627\u0632\u0629";
  RequestType2["Meeting"] = "\u0637\u0644\u0628 \u0627\u062C\u062A\u0645\u0627\u0639";
  RequestType2["InfoUpdate"] = "\u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A";
  RequestType2["Other"] = "\u0623\u062E\u0631\u0649";
  return RequestType2;
})(RequestType || {});
var AssignmentStatus = /* @__PURE__ */ ((AssignmentStatus2) => {
  AssignmentStatus2["Published"] = "\u0645\u0646\u0634\u0648\u0631";
  AssignmentStatus2["Draft"] = "\u0645\u0633\u0648\u062F\u0629";
  return AssignmentStatus2;
})(AssignmentStatus || {});

// src/constants-simple.ts
var MOCK_PRICING_CONFIG = {
  pricePerStudent: 3750
  // 3750 ريال يمني لكل طالب شهرياً
};
var MOCK_MODULES = [
  {
    id: "student_management" /* StudentManagement */,
    name: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0637\u0644\u0627\u0628 \u0648\u0627\u0644\u0645\u0639\u0644\u0645\u064A\u0646",
    description: "\u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0623\u0633\u0627\u0633\u064A \u0644\u0625\u062F\u0627\u0631\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628 \u0648\u0627\u0644\u0645\u0639\u0644\u0645\u064A\u0646 \u0648\u0645\u0644\u0641\u0627\u062A\u0647\u0645 \u0627\u0644\u0634\u062E\u0635\u064A\u0629.",
    monthlyPrice: 0,
    oneTimePrice: 125e5,
    // 12.5 مليون ريال يمني
    isEnabled: true,
    isCore: true
  },
  {
    id: "academic_management" /* AcademicManagement */,
    name: "\u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629",
    description: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0641\u0635\u0648\u0644\u060C \u0627\u0644\u062D\u0636\u0648\u0631 \u0648\u0627\u0644\u063A\u064A\u0627\u0628\u060C \u0627\u0644\u062F\u0631\u062C\u0627\u062A\u060C \u0648\u0627\u0644\u062C\u062F\u0627\u0648\u0644 \u0627\u0644\u062F\u0631\u0627\u0633\u064A\u0629.",
    monthlyPrice: 0,
    oneTimePrice: 1e7,
    // 10 ملايين ريال يمني
    isEnabled: true,
    isCore: true
  },
  { id: "finance" /* Finance */, name: "\u0627\u0644\u0648\u062D\u062F\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0629", description: "\u0625\u062F\u0627\u0631\u0629 \u0634\u0627\u0645\u0644\u0629 \u0644\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0648\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A\u0629.", monthlyPrice: 125e3, oneTimePrice: 375e4, isEnabled: true },
  { id: "transportation" /* Transportation */, name: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0646\u0642\u0644 \u0627\u0644\u0645\u062F\u0631\u0633\u064A", description: "\u062A\u062A\u0628\u0639 \u0627\u0644\u062D\u0627\u0641\u0644\u0627\u062A \u0648\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0648\u0627\u0644\u0633\u0627\u0626\u0642\u064A\u0646.", monthlyPrice: 1e5, oneTimePrice: 3e6, isEnabled: true },
  { id: "advanced_reports" /* AdvancedReports */, name: "\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0629", description: "\u062A\u062D\u0644\u064A\u0644\u0627\u062A \u0648\u062A\u0642\u0627\u0631\u064A\u0631 \u0645\u062E\u0635\u0635\u0629 \u0644\u062F\u0639\u0645 \u0627\u062A\u062E\u0627\u0630 \u0627\u0644\u0642\u0631\u0627\u0631.", monthlyPrice: 75e3, oneTimePrice: 2e6, isEnabled: true },
  { id: "parent_portal" /* ParentPortal */, name: "\u0628\u0648\u0627\u0628\u0629 \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631 \u0627\u0644\u0643\u0627\u0645\u0644\u0629", description: "\u062A\u0648\u0627\u0635\u0644 \u0645\u062A\u0642\u062F\u0645 \u0648\u0645\u064A\u0632\u0627\u062A \u0625\u0636\u0627\u0641\u064A\u0629 \u0644\u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631.", monthlyPrice: 62500, oneTimePrice: 175e4, isEnabled: false }
];
var MOCK_SCHOOL_MODULES = [
  { schoolId: 1, moduleId: "finance" /* Finance */ },
  { schoolId: 1, moduleId: "transportation" /* Transportation */ },
  { schoolId: 2, moduleId: "finance" /* Finance */ }
];
var MOCK_USERS = [
  { id: "user_001", email: "super@admin.com", username: "superadmin", password: "password", role: "SUPER_ADMIN" /* SuperAdmin */, name: "\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645", phone: "0510000001" },
  { id: "user_002", email: "admin@school.com", username: "schooladmin", password: "password", role: "SCHOOL_ADMIN" /* SchoolAdmin */, schoolId: 1, name: "\u0645\u062F\u064A\u0631 \u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u0646\u0647\u0636\u0629", schoolRole: "\u0645\u062F\u064A\u0631" /* Admin */, phone: "0510000002" },
  { id: "user_003", email: "teacher@school.com", username: "teacher", password: "password", role: "TEACHER" /* Teacher */, schoolId: 1, name: "\u0623. \u0645\u062D\u0645\u062F \u0627\u0644\u063A\u0627\u0645\u062F\u064A", teacherId: "tech_001", phone: "0510000003" },
  { id: "user_004", email: "parent@school.com", username: "parent", password: "password", role: "PARENT" /* Parent */, schoolId: 1, name: "\u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", parentId: "par_001", phone: "0510000004" },
  { id: "user_005", email: "registrar@school.com", username: "registrar", password: "password", role: "SCHOOL_ADMIN" /* SchoolAdmin */, schoolId: 1, name: "\u0641\u0647\u062F \u0639\u0628\u062F\u0627\u0644\u0639\u0632\u064A\u0632", schoolRole: "\u0645\u0633\u0624\u0648\u0644 \u062A\u0633\u062C\u064A\u0644" /* Registrar */ },
  { id: "user_006", email: "accountant@school.com", username: "accountant", password: "password", role: "SCHOOL_ADMIN" /* SchoolAdmin */, schoolId: 1, name: "\u0633\u0627\u0631\u0629 \u0627\u0644\u062D\u0633\u0646", schoolRole: "\u0645\u0633\u0624\u0648\u0644 \u0645\u0627\u0644\u064A" /* Accountant */ },
  { id: "user_007", email: "expired@school.com", username: "expired", password: "password", role: "SCHOOL_ADMIN" /* SchoolAdmin */, schoolId: 5, name: "\u0645\u062F\u064A\u0631 \u062A\u062C\u0631\u064A\u0628\u064A \u0645\u0646\u062A\u0647\u064A", schoolRole: "\u0645\u062F\u064A\u0631" /* Admin */ },
  // SuperAdmin Team Members
  { id: "user_008", email: "financial@admin.com", username: "financialadmin", password: "password", role: "SUPER_ADMIN_FINANCIAL" /* SuperAdminFinancial */, name: "\u0645\u0633\u0624\u0648\u0644 \u0645\u0627\u0644\u064A", phone: "0510000008", permissions: ["view_financial_reports", "manage_billing", "view_subscriptions", "manage_invoices"] },
  { id: "user_009", email: "technical@admin.com", username: "technicaladmin", password: "password", role: "SUPER_ADMIN_TECHNICAL" /* SuperAdminTechnical */, name: "\u0645\u0633\u0624\u0648\u0644 \u0641\u0646\u064A", phone: "0510000009", permissions: ["manage_system_settings", "view_logs", "manage_features", "monitor_performance", "manage_api_keys"] },
  { id: "user_010", email: "supervisor@admin.com", username: "supervisoradmin", password: "password", role: "SUPER_ADMIN_SUPERVISOR" /* SuperAdminSupervisor */, name: "\u0645\u0634\u0631\u0641 \u0639\u0627\u0645", phone: "0510000010", permissions: ["view_all_schools", "manage_school_admins", "view_reports", "manage_content", "view_user_analytics"] }
];
var MOCK_SCHOOLS = [
  { id: 1, name: "\u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u0646\u0647\u0636\u0629 \u0627\u0644\u062D\u062F\u064A\u062B\u0629", plan: "\u0627\u0644\u0645\u0645\u064A\u0632\u0629" /* Premium */, status: "\u0646\u0634\u0637" /* Active */, students: 450, teachers: 30, balance: 0, joinDate: "2023-09-01" },
  { id: 2, name: "\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0642\u0628\u0644 \u0627\u0644\u062F\u0648\u0644\u064A\u0629", plan: "\u0627\u0644\u0645\u0624\u0633\u0633\u0627\u062A" /* Enterprise */, status: "\u0646\u0634\u0637" /* Active */, students: 1200, teachers: 85, balance: 0, joinDate: "2022-08-15" },
  { id: 3, name: "\u0645\u062F\u0627\u0631\u0633 \u0627\u0644\u0623\u0648\u0627\u0626\u0644 \u0627\u0644\u0646\u0645\u0648\u0630\u062C\u064A\u0629", plan: "\u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629" /* Basic */, status: "\u0645\u062A\u0623\u062E\u0631 \u0627\u0644\u062F\u0641\u0639" /* PastDue */, students: 200, teachers: 15, balance: 150, joinDate: "2023-10-05" },
  { id: 4, name: "\u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u0646\u0648\u0631 \u0627\u0644\u062E\u0627\u0635\u0629", plan: "\u0627\u0644\u0645\u0645\u064A\u0632\u0629" /* Premium */, status: "\u0646\u0634\u0637" /* Active */, students: 600, teachers: 42, balance: 0, joinDate: "2023-01-20" },
  { id: 5, name: "\u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u0625\u0628\u062F\u0627\u0639 \u0627\u0644\u062A\u0631\u0628\u0648\u064A", plan: "\u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629" /* Basic */, status: "\u0641\u062A\u0631\u0629 \u062A\u062C\u0631\u064A\u0628\u064A\u0629" /* Trial */, students: 150, teachers: 10, balance: 0, joinDate: "2024-03-01" },
  { id: 6, name: "\u0645\u062C\u0645\u0639 \u0627\u0644\u0641\u0644\u0627\u062D \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A", plan: "\u0627\u0644\u0645\u0624\u0633\u0633\u0627\u062A" /* Enterprise */, status: "\u0646\u0634\u0637" /* Active */, students: 2500, teachers: 150, balance: 0, joinDate: "2021-09-01" },
  { id: 7, name: "\u0631\u0648\u0636\u0629 \u0627\u0644\u0628\u0631\u0627\u0639\u0645 \u0627\u0644\u0635\u063A\u0627\u0631", plan: "\u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629" /* Basic */, status: "\u0645\u0644\u063A\u064A" /* Canceled */, students: 80, teachers: 7, balance: 0, joinDate: "2023-05-10" },
  { id: 8, name: "\u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u062D\u0643\u0645\u0629 \u0627\u0644\u062B\u0627\u0646\u0648\u064A\u0629", plan: "\u0627\u0644\u0645\u0645\u064A\u0632\u0629" /* Premium */, status: "\u0646\u0634\u0637" /* Active */, students: 850, teachers: 55, balance: 0, joinDate: "2022-11-11" }
];
var MOCK_REVENUE_DATA = [
  { month: "\u064A\u0646\u0627\u064A\u0631", revenue: 55e6 },
  // 55 مليون ريال يمني
  { month: "\u0641\u0628\u0631\u0627\u064A\u0631", revenue: 625e5 },
  // 62.5 مليون ريال يمني
  { month: "\u0645\u0627\u0631\u0633", revenue: 7e7 },
  // 70 مليون ريال يمني
  { month: "\u0623\u0628\u0631\u064A\u0644", revenue: 675e5 },
  // 67.5 مليون ريال يمني
  { month: "\u0645\u0627\u064A\u0648", revenue: 775e5 },
  // 77.5 مليون ريال يمني
  { month: "\u064A\u0648\u0646\u064A\u0648", revenue: 875e5 }
  // 87.5 مليون ريال يمني
];
var MOCK_PLANS = [
  {
    id: "basic",
    name: "\u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629" /* Basic */,
    price: 247500,
    // 247.5 ألف ريال يمني شهرياً
    pricePeriod: "\u0634\u0647\u0631\u064A\u0627\u064B",
    features: [
      "\u0627\u0644\u0648\u0638\u0627\u0626\u0641 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 (\u0627\u0644\u0637\u0644\u0627\u0628\u060C \u0627\u0644\u0635\u0641\u0648\u0641)",
      "\u062A\u0637\u0628\u064A\u0642 \u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631 (\u0645\u062D\u062F\u0648\u062F)",
      "\u062F\u0639\u0645 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A"
    ],
    limits: {
      students: 200,
      teachers: 15,
      storageGB: 5,
      branches: 1
    }
  },
  {
    id: "premium",
    name: "\u0627\u0644\u0645\u0645\u064A\u0632\u0629" /* Premium */,
    price: 622500,
    // 622.5 ألف ريال يمني شهرياً
    pricePeriod: "\u0634\u0647\u0631\u064A\u0627\u064B",
    features: [
      "\u0643\u0644 \u0645\u064A\u0632\u0627\u062A \u0627\u0644\u062E\u0637\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      "\u0625\u062F\u0627\u0631\u0629 \u0645\u0627\u0644\u064A\u0629 \u0645\u062A\u0642\u062F\u0645\u0629",
      "\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631 \u0648\u0627\u0644\u0645\u0639\u0644\u0645\u064A\u0646",
      "\u062F\u0639\u0645 \u0641\u0646\u064A \u0645\u062A\u0645\u064A\u0632"
    ],
    limits: {
      students: 1e3,
      teachers: 50,
      storageGB: 20,
      branches: 5
    },
    recommended: true
  },
  {
    id: "enterprise",
    name: "\u0627\u0644\u0645\u0624\u0633\u0633\u0627\u062A" /* Enterprise */,
    price: 0,
    // سعر مخصص
    pricePeriod: "\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627",
    features: [
      "\u0643\u0644 \u0645\u064A\u0632\u0627\u062A \u0627\u0644\u062E\u0637\u0629 \u0627\u0644\u0645\u0645\u064A\u0632\u0629",
      "\u062A\u0642\u0627\u0631\u064A\u0631 \u0645\u062E\u0635\u0635\u0629 \u0648\u0645\u062A\u0642\u062F\u0645\u0629",
      "\u0645\u062F\u064A\u0631 \u062D\u0633\u0627\u0628 \u0645\u062E\u0635\u0635",
      "\u0627\u0633\u062A\u0636\u0627\u0641\u0629 \u062E\u0627\u0635\u0629 \u0648\u062A\u0643\u0627\u0645\u0644\u0627\u062A API"
    ],
    limits: {
      students: "\u063A\u064A\u0631 \u0645\u062D\u062F\u0648\u062F",
      teachers: "\u063A\u064A\u0631 \u0645\u062D\u062F\u0648\u062F",
      storageGB: "\u063A\u064A\u0631 \u0645\u062D\u062F\u0648\u062F",
      branches: "\u063A\u064A\u0631 \u0645\u062D\u062F\u0648\u062F"
    }
  }
];
var MOCK_SUBSCRIPTIONS = [
  { id: "sub_1", schoolId: 1, schoolName: "\u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u0646\u0647\u0636\u0629 \u0627\u0644\u062D\u062F\u064A\u062B\u0629", plan: "\u0627\u0644\u0645\u0645\u064A\u0632\u0629" /* Premium */, status: "\u0646\u0634\u0637" /* Active */, startDate: "2023-09-01", renewalDate: "2024-09-01", amount: 622500 },
  { id: "sub_2", schoolId: 2, schoolName: "\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0642\u0628\u0644 \u0627\u0644\u062F\u0648\u0644\u064A\u0629", plan: "\u0627\u0644\u0645\u0624\u0633\u0633\u0627\u062A" /* Enterprise */, status: "\u0646\u0634\u0637" /* Active */, startDate: "2022-08-15", renewalDate: "2024-08-15", amount: 2247750 },
  { id: "sub_3", schoolId: 3, schoolName: "\u0645\u062F\u0627\u0631\u0633 \u0627\u0644\u0623\u0648\u0627\u0626\u0644 \u0627\u0644\u0646\u0645\u0648\u0630\u062C\u064A\u0629", plan: "\u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629" /* Basic */, status: "\u0645\u062A\u0623\u062E\u0631 \u0627\u0644\u062F\u0641\u0639" /* PastDue */, startDate: "2023-10-05", renewalDate: "2024-07-05", amount: 247500 },
  { id: "sub_4", schoolId: 4, schoolName: "\u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u0646\u0648\u0631 \u0627\u0644\u062E\u0627\u0635\u0629", plan: "\u0627\u0644\u0645\u0645\u064A\u0632\u0629" /* Premium */, status: "\u0646\u0634\u0637" /* Active */, startDate: "2023-01-20", renewalDate: "2025-01-20", amount: 622500 },
  { id: "sub_5", schoolId: 5, schoolName: "\u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u0625\u0628\u062F\u0627\u0639 \u0627\u0644\u062A\u0631\u0628\u0648\u064A", plan: "\u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629" /* Basic */, status: "\u0641\u062A\u0631\u0629 \u062A\u062C\u0631\u064A\u0628\u064A\u0629" /* Trial */, startDate: "2024-03-01", renewalDate: "2024-03-08", amount: 0, trialEndDate: "2024-03-08" },
  { id: "sub_6", schoolId: 7, schoolName: "\u0631\u0648\u0636\u0629 \u0627\u0644\u0628\u0631\u0627\u0639\u0645 \u0627\u0644\u0635\u063A\u0627\u0631", plan: "\u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629" /* Basic */, status: "\u0645\u0644\u063A\u064A" /* Canceled */, startDate: "2023-05-10", renewalDate: "2024-05-10", amount: 247500 },
  { id: "sub_8", schoolId: 8, schoolName: "\u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u062D\u0643\u0645\u0629 \u0627\u0644\u062B\u0627\u0646\u0648\u064A\u0629", plan: "\u0627\u0644\u0645\u0645\u064A\u0632\u0629" /* Premium */, status: "\u0646\u0634\u0637" /* Active */, startDate: "2022-11-11", renewalDate: "2024-11-11", amount: 622500 }
];
var MOCK_ROLES = [
  { id: "super_admin", name: "\u0645\u062F\u064A\u0631 \u0639\u0627\u0645 (Super Admin)", description: "\u064A\u0645\u062A\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0643\u0627\u0645\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0646\u0638\u0627\u0645\u060C \u0628\u0645\u0627 \u0641\u064A \u0630\u0644\u0643 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062F\u0627\u0631\u0633 \u0648\u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A \u0648\u0627\u0644\u062E\u0637\u0637.", userCount: 1 },
  { id: "school_admin", name: "\u0645\u062F\u064A\u0631 \u0645\u062F\u0631\u0633\u0629", description: "\u064A\u062F\u064A\u0631 \u0645\u062F\u0631\u0633\u0629 \u0648\u0627\u062D\u062F\u0629 \u0628\u0634\u0643\u0644 \u0643\u0627\u0645\u0644\u060C \u0628\u0645\u0627 \u0641\u064A \u0630\u0644\u0643 \u0627\u0644\u0637\u0644\u0627\u0628 \u0648\u0627\u0644\u0645\u0639\u0644\u0645\u064A\u0646 \u0648\u0627\u0644\u0635\u0641\u0648\u0641 \u0648\u0627\u0644\u0645\u0627\u0644\u064A\u0629.", userCount: 8 },
  { id: "teacher", name: "\u0645\u0639\u0644\u0645", description: "\u064A\u062F\u064A\u0631 \u0635\u0641\u0648\u0641\u0647\u060C \u0648\u064A\u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u0648\u0627\u0644\u062F\u0631\u062C\u0627\u062A\u060C \u0648\u064A\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631.", userCount: 294 },
  { id: "parent", name: "\u0648\u0644\u064A \u0623\u0645\u0631", description: "\u064A\u062A\u0627\u0628\u0639 \u062A\u0642\u062F\u0645 \u0623\u0628\u0646\u0627\u0626\u0647\u060C \u0648\u064A\u0637\u0644\u0639 \u0639\u0644\u0649 \u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0648\u0627\u0644\u063A\u064A\u0627\u0628\u060C \u0648\u064A\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0645\u062F\u0631\u0633\u0629.", userCount: 4250 },
  { id: "student", name: "\u0637\u0627\u0644\u0628", description: "\u064A\u0637\u0644\u0639 \u0639\u0644\u0649 \u062C\u062F\u0648\u0644\u0647 \u0648\u062F\u0631\u062C\u0627\u062A\u0647 \u0648\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u062F\u0631\u0627\u0633\u064A\u0629 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0647.", userCount: 5200 }
];
var MOCK_STUDENTS = [
  { id: "std_001", name: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", grade: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062E\u0627\u0645\u0633", parentName: "\u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", status: "\u0646\u0634\u0637" /* Active */, registrationDate: "2022-09-01", profileImageUrl: "https://picsum.photos/seed/std_001/100/100", dateOfBirth: "2014-05-10" },
  { id: "std_002", name: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F \u062D\u0633\u064A\u0646", grade: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0644\u062B", parentName: "\u062E\u0627\u0644\u062F \u062D\u0633\u064A\u0646", status: "\u0646\u0634\u0637" /* Active */, registrationDate: "2023-09-05", profileImageUrl: "https://picsum.photos/seed/std_002/100/100", dateOfBirth: "2016-08-22" },
  { id: "std_003", name: "\u064A\u0648\u0633\u0641 \u0639\u0644\u064A \u0625\u0628\u0631\u0627\u0647\u064A\u0645", grade: "\u0627\u0644\u0635\u0641 \u0627\u0644\u0639\u0627\u0634\u0631", parentName: "\u0639\u0644\u064A \u0625\u0628\u0631\u0627\u0647\u064A\u0645", status: "\u0645\u0648\u0642\u0648\u0641" /* Suspended */, registrationDate: "2020-08-20", profileImageUrl: "https://picsum.photos/seed/std_003/100/100", dateOfBirth: "2009-01-15" }
];
var MOCK_TEACHERS = [
  { id: "tech_001", name: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F", email: "ahmed@school.com", phone: "0512345678", subject: "\u0631\u064A\u0627\u0636\u064A\u0627\u062A", status: "\u0646\u0634\u0637" /* Active */, hireDate: "2020-08-15", profileImageUrl: "https://picsum.photos/seed/tech_001/100/100" },
  { id: "tech_002", name: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F", email: "fatima@school.com", phone: "0512345679", subject: "\u0639\u0644\u0648\u0645", status: "\u0646\u0634\u0637" /* Active */, hireDate: "2021-09-01", profileImageUrl: "https://picsum.photos/seed/tech_002/100/100" },
  { id: "tech_003", name: "\u0645\u062D\u0645\u062F \u0639\u0644\u064A", email: "mohammed@school.com", phone: "0512345680", subject: "\u0644\u063A\u0629 \u0639\u0631\u0628\u064A\u0629", status: "\u0641\u064A \u0625\u062C\u0627\u0632\u0629" /* OnLeave */, hireDate: "2019-01-10", profileImageUrl: "https://picsum.photos/seed/tech_003/100/100" }
];
var MOCK_CLASSES = [
  { id: "cls_001", name: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062E\u0627\u0645\u0633 \u0623", grade: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062E\u0627\u0645\u0633", teacherId: "tech_001", teacherName: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F", studentCount: 25, room: "101" },
  { id: "cls_002", name: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0644\u062B \u0628", grade: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0644\u062B", teacherId: "tech_002", teacherName: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F", studentCount: 28, room: "102" },
  { id: "cls_003", name: "\u0627\u0644\u0635\u0641 \u0627\u0644\u0639\u0627\u0634\u0631 \u0623", grade: "\u0627\u0644\u0635\u0641 \u0627\u0644\u0639\u0627\u0634\u0631", teacherId: "tech_003", teacherName: "\u0645\u062D\u0645\u062F \u0639\u0644\u064A", studentCount: 30, room: "201" }
];
var MOCK_INVOICES = [
  { id: "inv_001", schoolId: 1, schoolName: "\u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u0646\u0647\u0636\u0629 \u0627\u0644\u062D\u062F\u064A\u062B\u0629", amount: 1245e3, dueDate: "2024-01-31", status: "\u0645\u062F\u0641\u0648\u0639\u0629" /* Paid */, description: "\u0631\u0633\u0648\u0645 \u0634\u0647\u0631 \u064A\u0646\u0627\u064A\u0631 2024" },
  { id: "inv_002", schoolId: 1, schoolName: "\u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u0646\u0647\u0636\u0629 \u0627\u0644\u062D\u062F\u064A\u062B\u0629", amount: 1245e3, dueDate: "2024-02-29", status: "\u063A\u064A\u0631 \u0645\u062F\u0641\u0648\u0639\u0629" /* Unpaid */, description: "\u0631\u0633\u0648\u0645 \u0634\u0647\u0631 \u0641\u0628\u0631\u0627\u064A\u0631 2024" },
  { id: "inv_003", schoolId: 2, schoolName: "\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0642\u0628\u0644 \u0627\u0644\u062F\u0648\u0644\u064A\u0629", amount: 4495500, dueDate: "2024-01-31", status: "\u0645\u062F\u0641\u0648\u0639\u0629" /* Paid */, description: "\u0631\u0633\u0648\u0645 \u0634\u0647\u0631 \u064A\u0646\u0627\u064A\u0631 2024" }
];
var MOCK_PARENTS = [
  { id: "par_001", name: "\u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", email: "mohammed@parent.com", phone: "0511111111", childrenCount: 2, accountStatus: "\u0646\u0634\u0637" /* Active */ },
  { id: "par_002", name: "\u062E\u0627\u0644\u062F \u062D\u0633\u064A\u0646", email: "khaled@parent.com", phone: "0511111112", childrenCount: 1, accountStatus: "\u0646\u0634\u0637" /* Active */ },
  { id: "par_003", name: "\u0639\u0644\u064A \u0625\u0628\u0631\u0627\u0647\u064A\u0645", email: "ali@parent.com", phone: "0511111113", childrenCount: 3, accountStatus: "\u0645\u062F\u0639\u0648" /* Invited */ }
];
var MOCK_SCHOOL_SETTINGS = {
  schoolId: 1,
  schoolName: "\u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u0646\u0647\u0636\u0629 \u0627\u0644\u062D\u062F\u064A\u062B\u0629",
  address: "\u0634\u0627\u0631\u0639 \u0627\u0644\u0645\u0644\u0643 \u0639\u0628\u062F\u0627\u0644\u0639\u0632\u064A\u0632\u060C \u062D\u064A \u0627\u0644\u0646\u0647\u0636\u0629\u060C \u0635\u0646\u0639\u0627\u0621",
  phone: "0123456789",
  email: "info@nahda-school.com",
  website: "www.nahda-school.com",
  logo: "https://via.placeholder.com/150",
  primaryColor: "#3B82F6",
  secondaryColor: "#10B981",
  language: "ar",
  timezone: "Asia/Aden",
  currency: "YER",
  gradingSystem: "percentage",
  attendanceRequired: true,
  notificationsEnabled: true,
  parentPortalEnabled: true,
  teacherPortalEnabled: true,
  studentPortalEnabled: true,
  financeModuleEnabled: true,
  transportationModuleEnabled: true,
  advancedReportsEnabled: true,
  apiEnabled: false,
  maxStorageGB: 20,
  maxUsers: 1e3,
  maxStudents: 1e3,
  maxTeachers: 50,
  maxBranches: 5
};
var MOCK_EVENTS = [
  { id: "evt_001", title: "\u0627\u062C\u062A\u0645\u0627\u0639 \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631", description: "\u0627\u062C\u062A\u0645\u0627\u0639 \u0631\u0628\u0639 \u0633\u0646\u0648\u064A \u0645\u0639 \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631", date: "2024-01-15", time: "18:00", location: "\u0642\u0627\u0639\u0629 \u0627\u0644\u0645\u062F\u0631\u0633\u0629", type: "\u0627\u062C\u062A\u0645\u0627\u0639" /* Meeting */ },
  { id: "evt_002", title: "\u0627\u0645\u062A\u062D\u0627\u0646\u0627\u062A \u0645\u0646\u062A\u0635\u0641 \u0627\u0644\u0641\u0635\u0644", description: "\u0627\u0645\u062A\u062D\u0627\u0646\u0627\u062A \u0645\u0646\u062A\u0635\u0641 \u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u062F\u0631\u0627\u0633\u064A", date: "2024-02-01", time: "08:00", location: "\u0627\u0644\u0635\u0641\u0648\u0641", type: "\u0627\u062E\u062A\u0628\u0627\u0631" /* Exam */ },
  { id: "evt_003", title: "\u0639\u0637\u0644\u0629 \u0645\u0646\u062A\u0635\u0641 \u0627\u0644\u0641\u0635\u0644", description: "\u0639\u0637\u0644\u0629 \u0645\u0646\u062A\u0635\u0641 \u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u062F\u0631\u0627\u0633\u064A", date: "2024-02-15", time: "00:00", location: "\u0627\u0644\u0645\u062F\u0631\u0633\u0629", type: "\u0639\u0637\u0644\u0629" /* Holiday */ }
];
var MOCK_GRADES = [
  { studentId: "std_001", studentName: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", classId: "cls_001", className: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062E\u0627\u0645\u0633 \u0623", grades: [{ subject: "\u0631\u064A\u0627\u0636\u064A\u0627\u062A", grade: 85, maxGrade: 100 }, { subject: "\u0639\u0644\u0648\u0645", grade: 92, maxGrade: 100 }, { subject: "\u0644\u063A\u0629 \u0639\u0631\u0628\u064A\u0629", grade: 78, maxGrade: 100 }], average: 85 },
  { studentId: "std_002", studentName: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F \u062D\u0633\u064A\u0646", classId: "cls_002", className: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0644\u062B \u0628", grades: [{ subject: "\u0631\u064A\u0627\u0636\u064A\u0627\u062A", grade: 95, maxGrade: 100 }, { subject: "\u0639\u0644\u0648\u0645", grade: 88, maxGrade: 100 }, { subject: "\u0644\u063A\u0629 \u0639\u0631\u0628\u064A\u0629", grade: 90, maxGrade: 100 }], average: 91 },
  { studentId: "std_003", studentName: "\u064A\u0648\u0633\u0641 \u0639\u0644\u064A \u0625\u0628\u0631\u0627\u0647\u064A\u0645", classId: "cls_003", className: "\u0627\u0644\u0635\u0641 \u0627\u0644\u0639\u0627\u0634\u0631 \u0623", grades: [{ subject: "\u0631\u064A\u0627\u0636\u064A\u0627\u062A", grade: 72, maxGrade: 100 }, { subject: "\u0639\u0644\u0648\u0645", grade: 65, maxGrade: 100 }, { subject: "\u0644\u063A\u0629 \u0639\u0631\u0628\u064A\u0629", grade: 80, maxGrade: 100 }], average: 72 }
];
var MOCK_ATTENDANCE = [
  { date: "2024-01-08", classId: "cls_001", className: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062E\u0627\u0645\u0633 \u0623", present: 22, absent: 3, late: 0 },
  { date: "2024-01-08", classId: "cls_002", className: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0644\u062B \u0628", present: 25, absent: 3, late: 0 },
  { date: "2024-01-08", classId: "cls_003", className: "\u0627\u0644\u0635\u0641 \u0627\u0644\u0639\u0627\u0634\u0631 \u0623", present: 28, absent: 2, late: 0 }
];
var MOCK_STUDENT_NOTES = [
  { id: "note_001", studentId: "std_001", studentName: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", note: "\u0637\u0627\u0644\u0628 \u0645\u062C\u062A\u0647\u062F \u0648\u0645\u062A\u0641\u0627\u0639\u0644 \u0641\u064A \u0627\u0644\u0635\u0641", date: "2024-01-05", author: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F", type: "positive" },
  { id: "note_002", studentId: "std_002", studentName: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F \u062D\u0633\u064A\u0646", note: "\u062A\u062D\u062A\u0627\u062C \u0644\u0645\u0632\u064A\u062F \u0645\u0646 \u0627\u0644\u062A\u0631\u0643\u064A\u0632 \u0641\u064A \u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A", date: "2024-01-06", author: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F", type: "improvement" },
  { id: "note_003", studentId: "std_003", studentName: "\u064A\u0648\u0633\u0641 \u0639\u0644\u064A \u0625\u0628\u0631\u0627\u0647\u064A\u0645", note: "\u063A\u064A\u0627\u0628 \u0645\u062A\u0643\u0631\u0631 \u0628\u062F\u0648\u0646 \u0639\u0630\u0631", date: "2024-01-07", author: "\u0645\u062D\u0645\u062F \u0639\u0644\u064A", type: "negative" }
];
var MOCK_STUDENT_DOCUMENTS = [
  { id: "doc_001", studentId: "std_001", studentName: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", fileName: "\u0634\u0647\u0627\u062F\u0629 \u0627\u0644\u0645\u064A\u0644\u0627\u062F.pdf", fileUrl: "https://via.placeholder.com/100", uploadDate: "2022-09-01", fileSize: 1024 },
  { id: "doc_002", studentId: "std_001", studentName: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", fileName: "\u0635\u0648\u0631\u0629 \u0627\u0644\u0647\u0648\u064A\u0629.pdf", fileUrl: "https://via.placeholder.com/100", uploadDate: "2022-09-01", fileSize: 512 },
  { id: "doc_003", studentId: "std_002", studentName: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F \u062D\u0633\u064A\u0646", fileName: "\u0634\u0647\u0627\u062F\u0629 \u0627\u0644\u0645\u064A\u0644\u0627\u062F.pdf", fileUrl: "https://via.placeholder.com/100", uploadDate: "2023-09-05", fileSize: 768 }
];
var MOCK_ACTION_ITEMS = [
  { id: "action_001", title: "\u0645\u0631\u0627\u062C\u0639\u0629 \u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628", description: "\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0627\u0639\u062A\u0645\u0627\u062F \u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628 \u0644\u0644\u0641\u0635\u0644 \u0627\u0644\u062F\u0631\u0627\u0633\u064A", type: ActionItemType.GradeReview, dueDate: "2024-01-15", assignedTo: "\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u062F\u0631\u0633\u0629", status: "pending", priority: "high" },
  { id: "action_002", title: "\u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631", description: "\u062A\u062D\u062F\u064A\u062B \u0623\u0631\u0642\u0627\u0645 \u0647\u0648\u0627\u062A\u0641 \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631", type: ActionItemType.ParentUpdate, dueDate: "2024-01-20", assignedTo: "\u0645\u0633\u062C\u0644", status: "in-progress", priority: "medium" },
  { id: "action_003", title: "\u0635\u064A\u0627\u0646\u0629 \u0645\u0639\u062F\u0627\u062A \u0627\u0644\u062D\u0627\u0633\u0648\u0628", description: "\u0635\u064A\u0627\u0646\u0629 \u0623\u062C\u0647\u0632\u0629 \u0627\u0644\u062D\u0627\u0633\u0648\u0628 \u0641\u064A \u0627\u0644\u0645\u062E\u062A\u0628\u0631", type: ActionItemType.Maintenance, dueDate: "2024-01-25", assignedTo: "\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u062A\u0642\u0646\u064A\u0629", status: "completed", priority: "low" }
];
var MOCK_CONVERSATIONS = [
  { id: "conv_001", participant1: "\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u062F\u0631\u0633\u0629", participant2: "\u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631 \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", lastMessage: "\u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0639\u0627\u0648\u0646\u0643\u0645", lastMessageDate: "2024-01-08", unreadCount: 0, type: ConversationType.ParentSchool },
  { id: "conv_002", participant1: "\u0627\u0644\u0645\u0639\u0644\u0645 \u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F", participant2: "\u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631 \u062E\u0627\u0644\u062F \u062D\u0633\u064A\u0646", lastMessage: "\u0633\u0623\u0631\u0633\u0644 \u0644\u0643 \u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u062A\u0642\u062F\u0645 \u0642\u0631\u064A\u0628\u0627\u064B", lastMessageDate: "2024-01-07", unreadCount: 2, type: ConversationType.ParentTeacher },
  { id: "conv_003", participant1: "\u0627\u0644\u0645\u0639\u0644\u0645 \u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F", participant2: "\u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631 \u0639\u0644\u064A \u0625\u0628\u0631\u0627\u0647\u064A\u0645", lastMessage: "\u0627\u0628\u0646\u0643 \u064A\u062D\u062A\u0627\u062C \u0644\u0645\u0632\u064A\u062F \u0645\u0646 \u0627\u0644\u062A\u0631\u0643\u064A\u0632", lastMessageDate: "2024-01-06", unreadCount: 1, type: ConversationType.ParentTeacher }
];
var MOCK_RECENT_ACTIVITIES = [
  { id: "activity_001", user: "\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u062F\u0631\u0633\u0629", action: "\u0623\u0636\u0627\u0641 \u0637\u0627\u0644\u0628 \u062C\u062F\u064A\u062F", target: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", timestamp: "2024-01-08T10:30:00", type: ActivityType.StudentAdded },
  { id: "activity_002", user: "\u0627\u0644\u0645\u0639\u0644\u0645 \u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F", action: "\u0633\u062C\u0644 \u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628", target: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062E\u0627\u0645\u0633 \u0623", timestamp: "2024-01-08T09:15:00", type: ActivityType.GradesSubmitted },
  { id: "activity_003", user: "\u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631 \u062E\u0627\u0644\u062F \u062D\u0633\u064A\u0646", action: "\u062F\u0641\u0639 \u0631\u0633\u0648\u0645 \u0634\u0647\u0631 \u064A\u0646\u0627\u064A\u0631", target: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F \u062D\u0633\u064A\u0646", timestamp: "2024-01-07T14:20:00", type: ActivityType.PaymentMade }
];
var MOCK_SCHEDULE = [
  { id: "sched_001", classId: "cls_001", className: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062E\u0627\u0645\u0633 \u0623", day: "Sunday", startTime: "08:00", endTime: "08:45", subject: "\u0631\u064A\u0627\u0636\u064A\u0627\u062A", teacher: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F" },
  { id: "sched_002", classId: "cls_001", className: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062E\u0627\u0645\u0633 \u0623", day: "Sunday", startTime: "08:45", endTime: "09:30", subject: "\u0639\u0644\u0648\u0645", teacher: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F" },
  { id: "sched_003", classId: "cls_002", className: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0644\u062B \u0628", day: "Sunday", startTime: "08:00", endTime: "08:45", subject: "\u0644\u063A\u0629 \u0639\u0631\u0628\u064A\u0629", teacher: "\u0645\u062D\u0645\u062F \u0639\u0644\u064A" }
];
var MOCK_MESSAGES = [
  { id: "msg_001", conversationId: "conv_001", sender: "\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u062F\u0631\u0633\u0629", content: "\u0645\u0631\u062D\u0628\u0627\u064B\u060C \u0623\u0648\u062F \u0625\u0639\u0644\u0627\u0645\u0643\u0645 \u0628\u062A\u0642\u062F\u0645 \u0627\u0628\u0646\u0643\u0645 \u0623\u062D\u0645\u062F", timestamp: "2024-01-08T10:30:00", isRead: true },
  { id: "msg_002", conversationId: "conv_001", sender: "\u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631 \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", content: "\u0634\u0643\u0631\u0627\u064B \u062C\u0632\u064A\u0644\u0627\u064B\u060C \u0646\u0642\u062F\u0631 \u062C\u0647\u0648\u062F\u0643\u0645", timestamp: "2024-01-08T10:35:00", isRead: true },
  { id: "msg_003", conversationId: "conv_002", sender: "\u0627\u0644\u0645\u0639\u0644\u0645 \u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F", content: "\u0627\u0628\u0646\u062A\u0643\u0645 \u0641\u0627\u0637\u0645\u0629 \u0645\u062C\u062A\u0647\u062F\u0629 \u062C\u062F\u0627\u064B", timestamp: "2024-01-07T09:15:00", isRead: false }
];
var MOCK_CLASS_ROSTERS = [
  { classId: "cls_001", studentIds: ["std_001", "std_004", "std_005"] },
  { classId: "cls_002", studentIds: ["std_002", "std_006"] },
  { classId: "cls_003", studentIds: ["std_003", "std_007"] }
];
var MOCK_PARENT_REQUESTS = [
  { id: "req_001", parentId: "par_001", parentName: "\u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", studentId: "std_001", studentName: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", type: "\u0637\u0644\u0628 \u0625\u062C\u0627\u0632\u0629" /* Leave */, status: "\u062A\u0645\u062A \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629" /* Approved */, reason: "\u0633\u0641\u0631 \u0639\u0627\u0626\u0644\u064A", startDate: "2024-01-15", endDate: "2024-01-20", submittedAt: "2024-01-10T08:30:00", approvedBy: "\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u062F\u0631\u0633\u0629" },
  { id: "req_002", parentId: "par_002", parentName: "\u062E\u0627\u0644\u062F \u062D\u0633\u064A\u0646", studentId: "std_002", studentName: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F \u062D\u0633\u064A\u0646", type: RequestType.MakeupExam, status: "\u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629" /* Pending */, reason: "\u0645\u0631\u0636 \u0627\u0644\u0637\u0641\u0644\u0629", examDate: "2024-01-20", submittedAt: "2024-01-12T14:15:00" },
  { id: "req_003", parentId: "par_003", parentName: "\u0639\u0644\u064A \u0625\u0628\u0631\u0627\u0647\u064A\u0645", studentId: "std_003", studentName: "\u064A\u0648\u0633\u0641 \u0639\u0644\u064A \u0625\u0628\u0631\u0627\u0647\u064A\u0645", type: RequestType.Transfer, status: "\u0645\u0631\u0641\u0648\u0636" /* Rejected */, reason: "\u0646\u0642\u0644 \u0625\u0644\u0649 \u0645\u062F\u0631\u0633\u0629 \u0623\u062E\u0631\u0649", submittedAt: "2024-01-05T09:45:00", rejectedBy: "\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u062F\u0631\u0633\u0629", rejectionReason: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0633\u062A\u064A\u0641\u0627\u0621 \u0627\u0644\u0634\u0631\u0648\u0637 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629" }
];
var MOCK_LANDING_PAGE_CONTENT = {
  heroTitle: "\u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062F\u0627\u0631\u0633 \u0627\u0644\u0634\u0627\u0645\u0644",
  heroSubtitle: "\u062D\u0644\u0648\u0644 \u0630\u0643\u064A\u0629 \u0644\u0625\u062F\u0627\u0631\u0629 \u0645\u062F\u0627\u0631\u0633\u0643 \u0628\u0643\u0641\u0627\u0621\u0629 \u0648\u0641\u0639\u0627\u0644\u064A\u0629",
  features: [
    { title: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0637\u0644\u0627\u0628 \u0648\u0627\u0644\u0645\u0639\u0644\u0645\u064A\u0646", description: "\u0646\u0638\u0627\u0645 \u0634\u0627\u0645\u0644 \u0644\u0625\u062F\u0627\u0631\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628 \u0648\u0627\u0644\u0645\u0639\u0644\u0645\u064A\u0646" },
    { title: "\u0627\u0644\u062D\u0636\u0648\u0631 \u0648\u0627\u0644\u063A\u064A\u0627\u0628", description: "\u062A\u062A\u0628\u0639 \u0627\u0644\u062D\u0636\u0648\u0631 \u0648\u0627\u0644\u063A\u064A\u0627\u0628 \u0628\u0633\u0647\u0648\u0644\u0629 \u0648\u0641\u0639\u0627\u0644\u064A\u0629" },
    { title: "\u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0648\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631", description: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0648\u062A\u0648\u0644\u064A\u062F \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u062A\u062D\u0644\u064A\u0644\u064A\u0629" },
    { title: "\u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0627\u0644\u0641\u0639\u0627\u0644", description: "\u062A\u0648\u0627\u0635\u0644 \u0641\u0639\u0627\u0644 \u0628\u064A\u0646 \u0627\u0644\u0645\u062F\u0631\u0633\u0629 \u0648\u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631" }
  ],
  testimonials: [
    { name: "\u0645\u062F\u064A\u0631 \u0645\u062F\u0631\u0633\u0629 \u0627\u0644\u0646\u0647\u0636\u0629", role: "\u0645\u062F\u064A\u0631 \u0645\u062F\u0631\u0633\u0629", comment: "\u0646\u0638\u0627\u0645 \u0631\u0627\u0626\u0639 \u0633\u0647\u0644 \u0639\u0644\u064A\u0646\u0627 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062F\u0631\u0633\u0629 \u0628\u0634\u0643\u0644 \u0627\u062D\u062A\u0631\u0627\u0641\u064A" },
    { name: "\u0623\u062D\u062F \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631", role: "\u0648\u0644\u064A \u0623\u0645\u0631", comment: "\u0623\u0633\u062A\u0637\u064A\u0639 \u0645\u062A\u0627\u0628\u0639\u0629 \u062A\u0642\u062F\u0645 \u0623\u0628\u0646\u0627\u0626\u064A \u0628\u0633\u0647\u0648\u0644\u0629 \u0645\u0646 \u062E\u0644\u0627\u0644 \u0627\u0644\u062A\u0637\u0628\u064A\u0642" }
  ]
};
var MOCK_BANK_ACCOUNTS = [
  { bankName: "\u0628\u0646\u0643 \u0627\u0644\u0643\u0631\u064A\u0645\u064A", accountName: "\u0645\u0624\u0633\u0633\u0629 SchoolSaaS \u0644\u0644\u062A\u0642\u0646\u064A\u0629", accountNumber: "123-456-789", iban: "YE81KREB000000123456789012" },
  { bankName: "\u0627\u0644\u0634\u0631\u0642 \u0644\u0644\u062D\u0648\u0627\u0644\u0627\u062A", accountName: "\u0645\u0624\u0633\u0633\u0629 SchoolSaaS \u0644\u0644\u062A\u0642\u0646\u064A\u0629", accountNumber: "987-654-321", iban: "\u063A\u064A\u0631 \u0645\u062A\u0627\u062D" },
  { bankName: "\u0628\u0646\u0643 \u0627\u0644\u062A\u0636\u0627\u0645\u0646", accountName: "\u0645\u0624\u0633\u0633\u0629 SchoolSaaS \u0644\u0644\u062A\u0642\u0646\u064A\u0629", accountNumber: "555-444-333", iban: "YE25TIBY000000555444333222" }
];
var MOCK_TEACHER_SALARY_SLIPS = [
  { id: "sal_001", teacherId: "tech_001", teacherName: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F", month: "\u064A\u0646\u0627\u064A\u0631 2024", basicSalary: 15e4, allowances: 5e4, deductions: 1e4, netSalary: 19e4, paymentDate: "2024-01-31" },
  { id: "sal_002", teacherId: "tech_002", teacherName: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F", month: "\u064A\u0646\u0627\u064A\u0631 2024", basicSalary: 14e4, allowances: 45e3, deductions: 8e3, netSalary: 177e3, paymentDate: "2024-01-31" },
  { id: "sal_003", teacherId: "tech_003", teacherName: "\u0645\u062D\u0645\u062F \u0639\u0644\u064A", month: "\u064A\u0646\u0627\u064A\u0631 2024", basicSalary: 16e4, allowances: 55e3, deductions: 12e3, netSalary: 203e3, paymentDate: "2024-01-31" }
];
var MOCK_ASSIGNMENTS = [
  { id: "assign_001", title: "\u0648\u0627\u062C\u0628 \u0631\u064A\u0627\u0636\u064A\u0627\u062A", description: "\u062D\u0644 \u062A\u0645\u0627\u0631\u064A\u0646 \u0627\u0644\u0636\u0631\u0628 \u0648\u0627\u0644\u0642\u0633\u0645\u0629", subject: "\u0631\u064A\u0627\u0636\u064A\u0627\u062A", classId: "cls_001", className: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062E\u0627\u0645\u0633 \u0623", teacherId: "tech_001", teacherName: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F", dueDate: "2024-01-15", maxScore: 100, status: AssignmentStatus.Active },
  { id: "assign_002", title: "\u0628\u062D\u062B \u0639\u0644\u0648\u0645", description: "\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0634\u0645\u0633\u064A", subject: "\u0639\u0644\u0648\u0645", classId: "cls_002", className: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0644\u062B \u0628", teacherId: "tech_002", teacherName: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F", dueDate: "2024-01-20", maxScore: 100, status: AssignmentStatus.Active },
  { id: "assign_003", title: "\u0645\u0642\u0627\u0644\u0629 \u0644\u063A\u0648\u064A\u0629", description: "\u0643\u062A\u0627\u0628\u0629 \u0645\u0642\u0627\u0644\u0629 \u0639\u0646 \u0627\u0644\u0639\u0637\u0644\u0629", subject: "\u0644\u063A\u0629 \u0639\u0631\u0628\u064A\u0629", classId: "cls_003", className: "\u0627\u0644\u0635\u0641 \u0627\u0644\u0639\u0627\u0634\u0631 \u0623", teacherId: "tech_003", teacherName: "\u0645\u062D\u0645\u062F \u0639\u0644\u064A", dueDate: "2024-01-18", maxScore: 100, status: AssignmentStatus.Closed }
];
var MOCK_SUBMISSIONS = [
  { id: "sub_001", assignmentId: "assign_001", assignmentTitle: "\u0648\u0627\u062C\u0628 \u0631\u064A\u0627\u0636\u064A\u0627\u062A", studentId: "std_001", studentName: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", submittedAt: "2024-01-12T15:30:00", score: 85, maxScore: 100, status: "\u062A\u0645 \u0627\u0644\u062A\u0642\u064A\u064A\u0645" /* Graded */, gradedBy: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F", feedback: "\u0639\u0645\u0644 \u0631\u0627\u0626\u0639!" },
  { id: "sub_002", assignmentId: "assign_001", assignmentTitle: "\u0648\u0627\u062C\u0628 \u0631\u064A\u0627\u0636\u064A\u0627\u062A", studentId: "std_004", studentName: "\u0633\u0627\u0631\u0629 \u0623\u062D\u0645\u062F", submittedAt: "2024-01-13T09:15:00", score: 0, maxScore: 100, status: "\u062A\u0645 \u0627\u0644\u062A\u0633\u0644\u064A\u0645" /* Submitted */ },
  { id: "sub_003", assignmentId: "assign_002", assignmentTitle: "\u0628\u062D\u062B \u0639\u0644\u0648\u0645", studentId: "std_002", studentName: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F \u062D\u0633\u064A\u0646", submittedAt: "2024-01-19T14:20:00", score: 92, maxScore: 100, status: "\u062A\u0645 \u0627\u0644\u062A\u0642\u064A\u064A\u0645" /* Graded */, gradedBy: "\u0641\u0627\u0637\u0645\u0629 \u062E\u0627\u0644\u062F", feedback: "\u0628\u062D\u062B \u0645\u0645\u062A\u0627\u0632!" }
];
var MOCK_BUS_OPERATORS = [
  { id: "bus_001", name: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0646\u0642\u0644 \u0627\u0644\u0645\u062F\u0631\u0633\u064A", email: "info@schoolbus.com", phone: "0512345678", address: "\u0635\u0646\u0639\u0627\u0621", status: "\u0645\u0639\u062A\u0645\u062F" /* Approved */, contractStart: "2023-09-01", contractEnd: "2024-08-31", vehicleCount: 5, driverCount: 5 },
  { id: "bus_002", name: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0623\u0645\u0627\u0646\u0629 \u0644\u0644\u0646\u0642\u0644", email: "amana@transport.com", phone: "0512345679", address: "\u0635\u0646\u0639\u0627\u0621", status: "\u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629" /* Pending */, contractStart: "2024-02-01", contractEnd: "2025-01-31", vehicleCount: 3, driverCount: 3 }
];
var MOCK_ROUTES = [
  { id: "route_001", name: "\u0627\u0644\u062E\u0637 \u0627\u0644\u0623\u0648\u0644 - \u062D\u064A \u0627\u0644\u0646\u0647\u0636\u0629", operatorId: "bus_001", operatorName: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0646\u0642\u0644 \u0627\u0644\u0645\u062F\u0631\u0633\u064A", driverName: "\u0639\u0644\u064A \u0623\u062D\u0645\u062F", vehicleNumber: "1234", stops: ["\u062C\u0627\u0645\u0639\u0629 \u0635\u0646\u0639\u0627\u0621", "\u062D\u064A \u0627\u0644\u0646\u0647\u0636\u0629", "\u0627\u0644\u0645\u062F\u0631\u0633\u0629"], capacity: 25, currentPassengers: 20, status: "active" },
  { id: "route_002", name: "\u0627\u0644\u062E\u0637 \u0627\u0644\u062B\u0627\u0646\u064A - \u062D\u064A \u0627\u0644\u0633\u0628\u0639\u064A\u0646", operatorId: "bus_001", operatorName: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0646\u0642\u0644 \u0627\u0644\u0645\u062F\u0631\u0633\u064A", driverName: "\u0645\u062D\u0645\u062F \u0639\u0644\u064A", vehicleNumber: "1235", stops: ["\u062D\u064A \u0627\u0644\u0633\u0628\u0639\u064A\u0646", "\u0634\u0627\u0631\u0639 \u0627\u0644\u0632\u0628\u064A\u0631\u064A", "\u0627\u0644\u0645\u062F\u0631\u0633\u0629"], capacity: 30, currentPassengers: 25, status: "active" }
];
var MOCK_EXPENSES = [
  { id: "exp_001", schoolId: 1, category: "\u0641\u0648\u0627\u062A\u064A\u0631 \u062E\u062F\u0645\u0627\u062A" /* Utilities */, description: "\u0641\u0627\u062A\u0648\u0631\u0629 \u0643\u0647\u0631\u0628\u0627\u0621 \u0634\u0647\u0631 \u064A\u0646\u0627\u064A\u0631", amount: 125e3, date: "2024-01-31", approvedBy: "\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u062F\u0631\u0633\u0629", status: "approved" },
  { id: "exp_002", schoolId: 1, category: "\u0635\u064A\u0627\u0646\u0629" /* Maintenance */, description: "\u0635\u064A\u0627\u0646\u0629 \u0645\u0643\u064A\u0641\u0627\u062A", amount: 375e3, date: "2024-01-15", approvedBy: "\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u062F\u0631\u0633\u0629", status: "approved" },
  { id: "exp_003", schoolId: 1, category: "\u0645\u0633\u062A\u0644\u0632\u0645\u0627\u062A" /* Supplies */, description: "\u0642\u0631\u0637\u0627\u0633\u064A\u0629 \u0648\u0645\u0633\u062A\u0644\u0632\u0645\u0627\u062A \u0645\u0643\u062A\u0628\u064A\u0629", amount: 25e4, date: "2024-01-10", approvedBy: "\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u062F\u0631\u0633\u0629", status: "pending" }
];
var SCHOOL_ROLE_PERMISSIONS = {
  ["\u0645\u062F\u064A\u0631" /* Admin */]: Object.values(Permission),
  // Admin has all permissions
  ["\u0645\u0633\u0624\u0648\u0644 \u062A\u0633\u062C\u064A\u0644" /* Registrar */]: [
    "VIEW_DASHBOARD" /* VIEW_DASHBOARD */,
    "MANAGE_STUDENTS" /* MANAGE_STUDENTS */,
    "MANAGE_PARENTS" /* MANAGE_PARENTS */,
    "MANAGE_ATTENDANCE" /* MANAGE_ATTENDANCE */
  ],
  ["\u0645\u0633\u0624\u0648\u0644 \u0645\u0627\u0644\u064A" /* Accountant */]: [
    "VIEW_DASHBOARD" /* VIEW_DASHBOARD */,
    "MANAGE_FINANCE" /* MANAGE_FINANCE */,
    "MANAGE_REPORTS" /* MANAGE_REPORTS */
  ],
  ["\u0645\u0646\u0633\u0642 \u0623\u0643\u0627\u062F\u064A\u0645\u064A" /* AcademicCoordinator */]: [
    "VIEW_DASHBOARD" /* VIEW_DASHBOARD */,
    "MANAGE_TEACHERS" /* MANAGE_TEACHERS */,
    "MANAGE_CLASSES" /* MANAGE_CLASSES */,
    "MANAGE_SCHEDULE" /* MANAGE_SCHEDULE */,
    "MANAGE_GRADES" /* MANAGE_GRADES */
  ]
};
export {
  MOCK_ACTION_ITEMS,
  MOCK_ASSIGNMENTS,
  MOCK_ATTENDANCE,
  MOCK_BANK_ACCOUNTS,
  MOCK_BUS_OPERATORS,
  MOCK_CLASSES,
  MOCK_CLASS_ROSTERS,
  MOCK_CONVERSATIONS,
  MOCK_EVENTS,
  MOCK_EXPENSES,
  MOCK_GRADES,
  MOCK_INVOICES,
  MOCK_LANDING_PAGE_CONTENT,
  MOCK_MESSAGES,
  MOCK_MODULES,
  MOCK_PARENTS,
  MOCK_PARENT_REQUESTS,
  MOCK_PLANS,
  MOCK_PRICING_CONFIG,
  MOCK_RECENT_ACTIVITIES,
  MOCK_REVENUE_DATA,
  MOCK_ROLES,
  MOCK_ROUTES,
  MOCK_SCHEDULE,
  MOCK_SCHOOLS,
  MOCK_SCHOOL_MODULES,
  MOCK_SCHOOL_SETTINGS,
  MOCK_STUDENTS,
  MOCK_STUDENT_DOCUMENTS,
  MOCK_STUDENT_NOTES,
  MOCK_SUBMISSIONS,
  MOCK_SUBSCRIPTIONS,
  MOCK_TEACHERS,
  MOCK_TEACHER_SALARY_SLIPS,
  MOCK_USERS,
  SCHOOL_ROLE_PERMISSIONS
};
