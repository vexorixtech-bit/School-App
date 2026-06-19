import 'package:flutter/material.dart';
import '../services/api_service.dart';

class TimetableScreen extends StatefulWidget {
  @override
  State<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends State<TimetableScreen> {
  List<dynamic> _entries = [];
  bool _loading = true;
  final _days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  @override
  void initState() {
    super.initState();
    _loadTimetable();
  }

  Future<void> _loadTimetable() async {
    try {
      final data = await ApiService.get('/api/timetable/');
      setState(() {
        _entries = data['entries'] as List<dynamic>;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Timetable')),
      body: _loading
        ? Center(child: CircularProgressIndicator())
        : ListView.builder(
            padding: EdgeInsets.all(16),
            itemCount: _days.length,
            itemBuilder: (_, i) {
              final dayEntries = _entries.where((e) => e['day_of_week'] == i).toList();
              return Card(
                margin: EdgeInsets.only(bottom: 8),
                child: Padding(
                  padding: EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_days[i], style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Theme.of(context).colorScheme.primary)),
                      SizedBox(height: 8),
                      if (dayEntries.isEmpty)
                        Text('No classes', style: TextStyle(color: Colors.grey, fontSize: 13))
                      else
                        ...dayEntries.map((e) => Padding(
                          padding: EdgeInsets.only(bottom: 6),
                          child: Row(
                            children: [
                              Container(
                                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.primaryContainer,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text('${e['start_time']}-${e['end_time']}', style: TextStyle(fontSize: 12)),
                              ),
                              SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(e['subject'] ?? '', style: TextStyle(fontWeight: FontWeight.w500)),
                                  Text(e['teacher'] ?? '', style: TextStyle(fontSize: 12, color: Colors.grey)),
                                ],
                              ),
                            ],
                          ),
                        )),
                    ],
                  ),
                ),
              );
            },
          ),
    );
  }
}
