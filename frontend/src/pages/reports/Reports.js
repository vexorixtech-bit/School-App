import React, { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('students');
  const [studentFilters, setStudentFilters] = useState({ class_name: '', section: '', status: '' });
  const [attendanceFilters, setAttendanceFilters] = useState({ class_id: '', month: new Date().toISOString().slice(0, 7) });
  const [feeFilters, setFeeFilters] = useState({ class_id: '', status: '' });
  const [examFilters, setExamFilters] = useState({ exam_id: '', class_id: '' });

  const getToken = () => localStorage.getItem('token');

  const downloadReport = (url) => {
    window.open(url + '?token=' + getToken(), '_blank');
  };

  const buildStudentUrl = (format) => {
    let url = API_BASE + '/api/reports/students?format=' + format;
    if (studentFilters.class_name) url += '&class_name=' + encodeURIComponent(studentFilters.class_name);
    if (studentFilters.section) url += '&section=' + encodeURIComponent(studentFilters.section);
    if (studentFilters.status) url += '&status=' + studentFilters.status;
    return url;
  };

  const buildAttendanceUrl = (format) => {
    let url = API_BASE + '/api/reports/attendance?format=' + format;
    if (attendanceFilters.class_id) url += '&class_id=' + attendanceFilters.class_id;
    if (attendanceFilters.month) url += '&month=' + attendanceFilters.month;
    return url;
  };

  const buildFeeUrl = (format) => {
    let url = API_BASE + '/api/reports/fees?format=' + format;
    if (feeFilters.class_id) url += '&class_id=' + feeFilters.class_id;
    if (feeFilters.status) url += '&status=' + feeFilters.status;
    return url;
  };

  const buildExamUrl = (format) => {
    let url = API_BASE + '/api/reports/exams?format=' + format;
    if (examFilters.exam_id) url += '&exam_id=' + examFilters.exam_id;
    if (examFilters.class_id) url += '&class_id=' + examFilters.class_id;
    return url;
  };

  const tabs = [
    { key: 'students', label: 'Student Report' },
    { key: 'attendance', label: 'Attendance Report' },
    { key: 'fees', label: 'Fee Report' },
    { key: 'exams', label: 'Exam Report' },
  ];

  const FilterBar = ({ children }) => (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      {children}
      <div className="flex gap-2 ml-auto">
        <button onClick={() => {}} className="btn-primary text-sm">Download PDF</button>
        <button onClick={() => {}} className="btn-secondary text-sm">Download Excel</button>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="page-title">Reports</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={'px-4 py-2 rounded-lg text-sm font-medium ' + (activeTab === tab.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card">
        {activeTab === 'students' && (
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="w-48">
                <input
                  type="text"
                  placeholder="Class Name"
                  value={studentFilters.class_name}
                  onChange={e => setStudentFilters({...studentFilters, class_name: e.target.value})}
                  className="input-field"
                />
              </div>
              <div className="w-36">
                <input
                  type="text"
                  placeholder="Section"
                  value={studentFilters.section}
                  onChange={e => setStudentFilters({...studentFilters, section: e.target.value})}
                  className="input-field"
                />
              </div>
              <div className="w-36">
                <select
                  value={studentFilters.status}
                  onChange={e => setStudentFilters({...studentFilters, status: e.target.value})}
                  className="input-field"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-2 ml-auto">
                <a href={buildStudentUrl('pdf')} className="btn-primary text-sm inline-block text-center">Download PDF</a>
                <a href={buildStudentUrl('excel')} className="btn-secondary text-sm inline-block text-center">Download Excel</a>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-400">
              Select filters and click Download to generate a student report
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="w-48">
                <input
                  type="text"
                  placeholder="Class ID"
                  value={attendanceFilters.class_id}
                  onChange={e => setAttendanceFilters({...attendanceFilters, class_id: e.target.value})}
                  className="input-field"
                />
              </div>
              <div className="w-44">
                <input
                  type="month"
                  value={attendanceFilters.month}
                  onChange={e => setAttendanceFilters({...attendanceFilters, month: e.target.value})}
                  className="input-field"
                />
              </div>
              <div className="flex gap-2 ml-auto">
                <a href={buildAttendanceUrl('pdf')} className="btn-primary text-sm inline-block text-center">Download PDF</a>
                <a href={buildAttendanceUrl('excel')} className="btn-secondary text-sm inline-block text-center">Download Excel</a>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-400">
              Select filters and click Download to generate an attendance report
            </div>
          </div>
        )}

        {activeTab === 'fees' && (
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="w-48">
                <input
                  type="text"
                  placeholder="Class ID"
                  value={feeFilters.class_id}
                  onChange={e => setFeeFilters({...feeFilters, class_id: e.target.value})}
                  className="input-field"
                />
              </div>
              <div className="w-36">
                <select
                  value={feeFilters.status}
                  onChange={e => setFeeFilters({...feeFilters, status: e.target.value})}
                  className="input-field"
                >
                  <option value="">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="flex gap-2 ml-auto">
                <a href={buildFeeUrl('pdf')} className="btn-primary text-sm inline-block text-center">Download PDF</a>
                <a href={buildFeeUrl('excel')} className="btn-secondary text-sm inline-block text-center">Download Excel</a>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-400">
              Select filters and click Download to generate a fee report
            </div>
          </div>
        )}

        {activeTab === 'exams' && (
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="w-48">
                <input
                  type="text"
                  placeholder="Exam ID"
                  value={examFilters.exam_id}
                  onChange={e => setExamFilters({...examFilters, exam_id: e.target.value})}
                  className="input-field"
                />
              </div>
              <div className="w-48">
                <input
                  type="text"
                  placeholder="Class ID"
                  value={examFilters.class_id}
                  onChange={e => setExamFilters({...examFilters, class_id: e.target.value})}
                  className="input-field"
                />
              </div>
              <div className="flex gap-2 ml-auto">
                <a href={buildExamUrl('pdf')} className="btn-primary text-sm inline-block text-center">Download PDF</a>
                <a href={buildExamUrl('excel')} className="btn-secondary text-sm inline-block text-center">Download Excel</a>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-400">
              Select filters and click Download to generate an exam report
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
