import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/models.dart';

class AttendanceScreen extends StatefulWidget {
  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  List<dynamic> _records = [];
  bool _loading = true;
  int? _total, _present, _absent;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final data = await ApiService.get('/api/attendance/summary');
      setState(() {
        _total = data['total'];
        _present = data['present'];
        _absent = data['absent'];
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Attendance')),
      body: _loading
        ? Center(child: CircularProgressIndicator())
        : Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    _StatCard(label: 'Total Days', value: '$_total', color: Colors.blue),
                    SizedBox(width: 12),
                    _StatCard(label: 'Present', value: '$_present', color: Colors.green),
                    SizedBox(width: 12),
                    _StatCard(label: 'Absent', value: '$_absent', color: Colors.red),
                  ],
                ),
                SizedBox(height: 24),
                Text('Attendance Records', style: Theme.of(context).textTheme.titleMedium),
                SizedBox(height: 8),
                Expanded(
                  child: ListView.builder(
                    itemCount: _records.length,
                    itemBuilder: (_, i) {
                      final r = _records[i];
                      return Card(
                        child: ListTile(
                          title: Text(r['date'] ?? ''),
                          trailing: Chip(
                            label: Text(r['status'] ?? ''),
                            backgroundColor: r['status'] == 'present' ? Colors.green.shade100 : Colors.red.shade100,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label, value;
  final Color color;
  const _StatCard({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Column(
            children: [
              Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: color)),
              SizedBox(height: 4),
              Text(label, style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }
}
