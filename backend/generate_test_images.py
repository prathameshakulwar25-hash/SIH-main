from PIL import Image, ImageDraw, ImageFont

# Create a sample prescription image
img1 = Image.new('RGB', (600, 400), color = (255, 255, 255))
d1 = ImageDraw.Draw(img1)
d1.text((20, 20), "Dr. Smith Clinic - 15/09/2026", fill=(0, 0, 0))
d1.text((20, 60), "Patient: Aryan", fill=(0, 0, 0))
d1.text((20, 100), "Rx:", fill=(0, 0, 0))
d1.text((20, 140), "Amoxicillin 500 mg TDS", fill=(0, 0, 0))
d1.text((20, 180), "Ibuprofen 400mg BD", fill=(0, 0, 0))
d1.text((20, 220), "Lisinopril 10mg OD", fill=(0, 0, 0))
img1.save("sample_prescription.jpg")

# Create a sample lab report image with a typo (HbA1e instead of HbA1c) and multiple labs on one line
img2 = Image.new('RGB', (600, 400), color = (255, 255, 255))
d2 = ImageDraw.Draw(img2)
d2.text((20, 20), "City Labs - Report Date: 16-Sep-2026", fill=(0, 0, 0))
d2.text((20, 60), "Hematology:", fill=(0, 0, 0))
# WBC normal (4.5 - 11.0), HbA1c high (4.0 - 5.6)
d2.text((20, 100), "WBC 8.5 10^9/L | RBC 4.2 | HbA1e 8.2 %", fill=(0, 0, 0)) 
d2.text((20, 140), "Biochemistry:", fill=(0, 0, 0))
# Creatinine normal (0.6 - 1.2)
d2.text((20, 180), "Creatinine 0.9 mg/dL", fill=(0, 0, 0))
img2.save("sample_lab_report.jpg")
