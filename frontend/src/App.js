import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import Dashboard from './pages/dashboard/Dashboard';
import Students from './pages/students/Students';
import StudentProfile from './pages/students/StudentProfile';
import Teachers from './pages/teachers/Teachers';
import TeacherProfile from './pages/teachers/TeacherProfile';
import Classes from './pages/classes/Classes';
import Attendance from './pages/attendance/Attendance';
import Fees from './pages/fees/Fees';
import StudentFees from './pages/fees/StudentFees';
import Exams from './pages/exams/Exams';
import Results from './pages/results/Results';
import Timetable from './pages/timetable/Timetable';
import Homework from './pages/homework/Homework';
import Events from './pages/events/Events';
import Notifications from './pages/notifications/Notifications';
import Reports from './pages/reports/Reports';
import Users from './pages/users/Users';
import Settings from './pages/settings/Settings';
import Profile from './pages/profile/Profile';

function PrivateRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" />;
  return <MainLayout>{children}</MainLayout>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', borderRadius: '12px', fontSize: '13px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }, success: { iconTheme: { primary: '#10b981', secondary: '#f0fdfa' } }, error: { iconTheme: { primary: '#f43f5e', secondary: '#fff1f2' } } }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/students" element={<PrivateRoute allowedRoles={['super_admin','admin','principal','teacher']}><Students /></PrivateRoute>} />
          <Route path="/students/:id" element={<PrivateRoute allowedRoles={['super_admin','admin','principal','teacher']}><StudentProfile /></PrivateRoute>} />
          <Route path="/teachers" element={<PrivateRoute allowedRoles={['super_admin','admin','principal']}><Teachers /></PrivateRoute>} />
          <Route path="/teachers/:id" element={<PrivateRoute allowedRoles={['super_admin','admin','principal']}><TeacherProfile /></PrivateRoute>} />
          <Route path="/classes" element={<PrivateRoute allowedRoles={['super_admin','admin','principal']}><Classes /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
          <Route path="/fees" element={<PrivateRoute allowedRoles={['super_admin','admin','principal','teacher']}><Fees /></PrivateRoute>} />
          <Route path="/my-fees" element={<PrivateRoute allowedRoles={['student']}><StudentFees /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/exams" element={<PrivateRoute allowedRoles={['super_admin','admin','principal','teacher']}><Exams /></PrivateRoute>} />
          <Route path="/results" element={<PrivateRoute allowedRoles={['super_admin','admin','principal','teacher','student']}><Results /></PrivateRoute>} />
          <Route path="/timetable" element={<PrivateRoute><Timetable /></PrivateRoute>} />
          <Route path="/homework" element={<PrivateRoute><Homework /></PrivateRoute>} />
          <Route path="/events" element={<PrivateRoute><Events /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute allowedRoles={['super_admin','admin']}><Users /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute allowedRoles={['super_admin','admin','principal']}><Reports /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
