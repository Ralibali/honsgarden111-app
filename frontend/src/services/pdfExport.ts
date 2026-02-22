import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import i18n from '../i18n';

interface ExportData {
  coopName: string;
  henCount: number;
  period: string;
  totalEggs: number;
  avgEggsPerDay: number;
  eggsPerHen: number | null;
  totalCosts: number;
  totalSales: number;
  net: number;
  dailyData?: Array<{ date: string; eggs: number; costs: number; sales: number }>;
  hens?: Array<{ name: string; eggs: number }>;
}

const getLocale = () => i18n.locale.startsWith('sv') ? sv : enUS;
const isSv = () => i18n.locale.startsWith('sv');

const formatCurrency = (amount: number): string => {
  return isSv() ? `${amount.toFixed(0)} kr` : `$${amount.toFixed(2)}`;
};

export const generateStatisticsPDF = async (data: ExportData): Promise<string> => {
  const t = i18n.t.bind(i18n);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${data.coopName} - ${isSv() ? 'Statistikrapport' : 'Statistics Report'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          color: #333;
          background: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #4CAF50;
        }
        .header h1 {
          font-size: 28px;
          color: #2d2d2d;
          margin-bottom: 8px;
        }
        .header p {
          color: #666;
          font-size: 14px;
        }
        .period {
          background: #f5f5f5;
          padding: 12px 20px;
          border-radius: 8px;
          margin-bottom: 24px;
          text-align: center;
          font-weight: 600;
          color: #4CAF50;
        }
        .stats-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 30px;
        }
        .stat-card {
          flex: 1;
          min-width: 120px;
          background: #f9f9f9;
          padding: 16px;
          border-radius: 12px;
          text-align: center;
        }
        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #2d2d2d;
        }
        .stat-value.positive { color: #4CAF50; }
        .stat-value.negative { color: #FF6B6B; }
        .stat-label {
          font-size: 12px;
          color: #888;
          margin-top: 4px;
          text-transform: uppercase;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #2d2d2d;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee;
        }
        .finance-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .finance-label { color: #666; }
        .finance-value { font-weight: 600; }
        .finance-value.positive { color: #4CAF50; }
        .finance-value.negative { color: #FF6B6B; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        th {
          background: #f5f5f5;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          color: #666;
        }
        td { font-size: 14px; }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
        .hen-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .hen-card {
          background: #f9f9f9;
          padding: 12px 16px;
          border-radius: 8px;
          min-width: 100px;
        }
        .hen-name { font-weight: 600; color: #2d2d2d; }
        .hen-eggs { color: #4CAF50; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🐔 ${data.coopName}</h1>
        <p>${isSv() ? 'Statistikrapport' : 'Statistics Report'}</p>
      </div>
      
      <div class="period">
        ${data.period}
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${data.henCount}</div>
          <div class="stat-label">${isSv() ? 'Hönor' : 'Hens'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.totalEggs}</div>
          <div class="stat-label">${isSv() ? 'Totalt ägg' : 'Total Eggs'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.avgEggsPerDay}</div>
          <div class="stat-label">${isSv() ? 'Snitt/dag' : 'Avg/day'}</div>
        </div>
        ${data.eggsPerHen ? `
        <div class="stat-card">
          <div class="stat-value">${data.eggsPerHen}</div>
          <div class="stat-label">${isSv() ? 'Ägg/höna' : 'Eggs/hen'}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="section">
        <div class="section-title">${isSv() ? 'Ekonomi' : 'Finance'}</div>
        <div class="finance-row">
          <span class="finance-label">${isSv() ? 'Kostnader' : 'Costs'}</span>
          <span class="finance-value negative">-${formatCurrency(data.totalCosts)}</span>
        </div>
        <div class="finance-row">
          <span class="finance-label">${isSv() ? 'Försäljning' : 'Sales'}</span>
          <span class="finance-value positive">+${formatCurrency(data.totalSales)}</span>
        </div>
        <div class="finance-row">
          <span class="finance-label">${isSv() ? 'Nettoresultat' : 'Net Result'}</span>
          <span class="finance-value ${data.net >= 0 ? 'positive' : 'negative'}">
            ${data.net >= 0 ? '+' : ''}${formatCurrency(data.net)}
          </span>
        </div>
      </div>
      
      ${data.hens && data.hens.length > 0 ? `
      <div class="section">
        <div class="section-title">${isSv() ? 'Ägg per höna' : 'Eggs per Hen'}</div>
        <div class="hen-grid">
          ${data.hens.map(hen => `
            <div class="hen-card">
              <div class="hen-name">${hen.name}</div>
              <div class="hen-eggs">${hen.eggs} ${isSv() ? 'ägg' : 'eggs'}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      ${data.dailyData && data.dailyData.length > 0 ? `
      <div class="section">
        <div class="section-title">${isSv() ? 'Daglig översikt' : 'Daily Overview'}</div>
        <table>
          <thead>
            <tr>
              <th>${isSv() ? 'Datum' : 'Date'}</th>
              <th>${isSv() ? 'Ägg' : 'Eggs'}</th>
              <th>${isSv() ? 'Kostnader' : 'Costs'}</th>
              <th>${isSv() ? 'Försäljning' : 'Sales'}</th>
            </tr>
          </thead>
          <tbody>
            ${data.dailyData.slice(0, 31).map(day => `
              <tr>
                <td>${format(new Date(day.date), 'd MMM', { locale: getLocale() })}</td>
                <td>${day.eggs}</td>
                <td class="negative">${day.costs > 0 ? '-' + formatCurrency(day.costs) : '-'}</td>
                <td class="positive">${day.sales > 0 ? '+' + formatCurrency(day.sales) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <div class="footer">
        ${isSv() ? 'Skapad med Hönshus Statistik' : 'Created with Chicken Coop Statistics'} • ${format(new Date(), 'yyyy-MM-dd HH:mm')}
      </div>
    </body>
    </html>
  `;
  
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
};

export const sharePDF = async (uri: string, filename?: string): Promise<void> => {
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: filename || 'Statistik.pdf',
      UTI: 'com.adobe.pdf',
    });
  }
};

export const exportAndSharePDF = async (data: ExportData): Promise<boolean> => {
  try {
    const uri = await generateStatisticsPDF(data);
    await sharePDF(uri, `${data.coopName}_${data.period}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF export failed:', error);
    return false;
  }
};
