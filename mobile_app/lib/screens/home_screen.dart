import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'attendance_screen.dart';
import 'fees_screen.dart';
import 'results_screen.dart';
import 'timetable_screen.dart';
import 'notifications_screen.dart';

class HomeScreen extends StatefulWidget {
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final _screens = [
    DashboardTab(),
    AttendanceTab(),
    FeesTab(),
    ResultsTab(),
    MoreTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('School ERP'),
        actions: [
          IconButton(
            icon: Icon(Icons.notifications_outlined),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => NotificationsScreen())),
          ),
          IconButton(
            icon: Icon(Icons.logout),
            onPressed: () => context.read<AuthProvider>().logout(),
          ),
        ],
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.calendar_today_outlined), selectedIcon: Icon(Icons.calendar_today), label: 'Attendance'),
          NavigationDestination(icon: Icon(Icons.account_balance_wallet_outlined), selectedIcon: Icon(Icons.account_balance_wallet), label: 'Fees'),
          NavigationDestination(icon: Icon(Icons.assessment_outlined), selectedIcon: Icon(Icons.assessment), label: 'Results'),
          NavigationDestination(icon: Icon(Icons.more_horiz), label: 'More'),
        ],
      ),
    );
  }
}

class DashboardTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return ListView(
      padding: EdgeInsets.all(16),
      children: [
        Card(
          child: ListTile(
            leading: CircleAvatar(child: Icon(Icons.person, color: Colors.white), backgroundColor: Theme.of(context).colorScheme.primary),
            title: Text(user?['full_name'] ?? 'Parent', style: TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('Parent Portal'),
          ),
        ),
        SizedBox(height: 16),
        Text('Quick Access', style: Theme.of(context).textTheme.titleMedium),
        SizedBox(height: 8),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.2,
          children: [
            _QuickAccessCard(icon: Icons.calendar_today, label: 'Attendance', color: Colors.blue, onTap: () {}),
            _QuickAccessCard(icon: Icons.account_balance_wallet, label: 'Fee Status', color: Colors.green, onTap: () {}),
            _QuickAccessCard(icon: Icons.assessment, label: 'Results', color: Colors.orange, onTap: () {}),
            _QuickAccessCard(icon: Icons.schedule, label: 'Timetable', color: Colors.purple, onTap: () {}),
          ],
        ),
        SizedBox(height: 16),
        Text('Recent Notifications', style: Theme.of(context).textTheme.titleMedium),
        SizedBox(height: 8),
        Card(child: ListTile(title: Text('No recent notifications'), subtitle: Text('Check back later'))),
      ],
    );
  }
}

class _QuickAccessCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickAccessCard({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 32, color: color),
              SizedBox(height: 8),
              Text(label, style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }
}

class AttendanceTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(child: Text('Attendance Screen'));
  }
}

class FeesTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(child: Text('Fees Screen'));
  }
}

class ResultsTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(child: Text('Results Screen'));
  }
}

class MoreTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: EdgeInsets.all(16),
      children: [
        ListTile(
          leading: Icon(Icons.schedule),
          title: Text('Timetable'),
          trailing: Icon(Icons.chevron_right),
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => TimetableScreen())),
        ),
        ListTile(
          leading: Icon(Icons.download),
          title: Text('Download Report Cards'),
          trailing: Icon(Icons.chevron_right),
        ),
        ListTile(
          leading: Icon(Icons.settings),
          title: Text('Settings'),
          trailing: Icon(Icons.chevron_right),
        ),
        ListTile(
          leading: Icon(Icons.info_outline),
          title: Text('About'),
          trailing: Icon(Icons.chevron_right),
        ),
        Divider(),
        ListTile(
          leading: Icon(Icons.logout, color: Colors.red),
          title: Text('Logout', style: TextStyle(color: Colors.red)),
          onTap: () => context.read<AuthProvider>().logout(),
        ),
      ],
    );
  }
}
