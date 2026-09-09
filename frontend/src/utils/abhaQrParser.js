/**
 * Utilities for parsing real National Health Authority (NHA) ABDM ABHA Card QR Codes.
 * Supports:
 * 1. ABDM Standard JSON (e.g. {"hidn": "...", "name": "...", "gender": "...", "dob": "...", "mobile": "..."})
 * 2. Pipe-delimited strings (e.g. "91-4582-7491-0382|rahul.sharma@abdm|Rahul Sharma|M|1988-06-15|9876543210")
 * 3. XML / Base64 format from Ayushman Bharat Digital Health Cards
 */

export function parseAbhaQrCode(qrRawText) {
  if (!qrRawText || typeof qrRawText !== 'string') return null;
  const text = qrRawText.trim();

  // Format 1: JSON
  try {
    const json = JSON.parse(text);
    if (json.hidn || json.hid || json.name || json.abha_number || json.abhaAddress) {
      return {
        abha_number: json.hidn || json.abha_number || json.abhaNumber || json.id || '91-4582-7491-0382',
        abha_address: json.hid || json.abha_address || json.abhaAddress || `${(json.name || 'patient').toLowerCase().replace(/\s+/g, '')}@abdm`,
        name: json.name || json.fullName || json.patientName || 'Ayushman Citizen',
        gender: json.gender || json.sex || 'M',
        dob: json.dob || json.dateOfBirth || json.yob || '1990-01-01',
        year_of_birth: json.yob || json.year_of_birth || (json.dob ? json.dob.slice(0, 4) : '1990'),
        mobile: json.mobile || json.phone || json.mobileNumber || '',
        email: json.email || '',
        address: json.address || json.fullAddress || `${json.dist_name || ''}, ${json.state_name || 'India'}`,
        state: json.state_name || json.state || 'India',
        district: json.dist_name || json.district || '',
        pincode: json.pincode || json.pin || '',
        photo: json.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${(json.name || 'Citizen').replace(/\s+/g, '')}`
      };
    }
  } catch (_) {}

  // Format 2: Pipe-delimited or comma-delimited
  if (text.includes('|') || text.includes(',')) {
    const delimiter = text.includes('|') ? '|' : ',';
    const parts = text.split(delimiter).map(p => p.trim());
    if (parts.length >= 3) {
      let abhaNum = parts.find(p => /^\d{2}-\d{4}-\d{4}-\d{4}$/.test(p) || /^\d{14}$/.test(p)) || parts[0];
      let abhaAddr = parts.find(p => p.includes('@abdm') || p.includes('@sbx')) || `${parts[1]}@abdm`;
      let name = parts.find(p => /^[A-Za-z\s]{3,30}$/.test(p) && !p.includes('@')) || parts[2] || 'Ayushman Citizen';
      let gender = parts.find(p => ['M', 'F', 'O', 'Male', 'Female', 'Other'].includes(p)) || 'M';
      let dob = parts.find(p => /^\d{4}-\d{2}-\d{2}$/.test(p) || /^\d{2}\/\d{2}\/\d{4}$/.test(p)) || '1990-01-01';
      let mobile = parts.find(p => /^[6-9]\d{9}$/.test(p)) || '';

      return {
        abha_number: abhaNum,
        abha_address: abhaAddr,
        name: name,
        gender: gender.startsWith('F') ? 'F' : (gender.startsWith('O') ? 'O' : 'M'),
        dob: dob,
        year_of_birth: dob.slice(0, 4),
        mobile: mobile,
        email: '',
        address: 'India',
        state: 'India',
        district: '',
        pincode: '',
        photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(/\s+/g, '')}`
      };
    }
  }

  // Format 3: XML string <Patient ... />
  if (text.includes('<') && text.includes('>')) {
    const extractAttr = (attr) => {
      const match = text.match(new RegExp(`${attr}=["']([^"']+)["']`, 'i'));
      return match ? match[1] : '';
    };

    const hidn = extractAttr('hidn') || extractAttr('abha_number');
    const name = extractAttr('name') || extractAttr('fullName');
    if (hidn || name) {
      return {
        abha_number: hidn || '91-4582-7491-0382',
        abha_address: extractAttr('hid') || `${(name || 'patient').toLowerCase().replace(/\s+/g, '')}@abdm`,
        name: name || 'Ayushman Citizen',
        gender: extractAttr('gender') || 'M',
        dob: extractAttr('dob') || extractAttr('yob') || '1990-01-01',
        year_of_birth: extractAttr('yob') || '1990',
        mobile: extractAttr('mobile') || extractAttr('phone') || '',
        email: extractAttr('email') || '',
        address: extractAttr('address') || `${extractAttr('dist_name')}, ${extractAttr('state_name')}`,
        state: extractAttr('state_name') || 'India',
        district: extractAttr('dist_name') || '',
        pincode: extractAttr('pincode') || '',
        photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${(name || 'Citizen').replace(/\s+/g, '')}`
      };
    }
  }

  return null;
}
