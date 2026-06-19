import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ResultsScreen extends StatefulWidget {
  @override
  State<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends State<ResultsScreen> {
  Map<String, dynamic>? _results;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadResults();
  }

  Future<void> _loadResults() async {
    try {
      final data = await ApiService.get('/api/exams/student/1/results');
      setState(() {
        _results = data;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Results')),
      body: _loading
        ? Center(child: CircularProgressIndicator())
        : _results == null || _results!.isEmpty
          ? Center(child: Text('No results available'))
          : ListView(
              padding: EdgeInsets.all(16),
              children: _results!.entries.map((entry) {
                return Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(entry.key, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        SizedBox(height: 8),
                        ...((entry.value as Map)['subjects'] as List).map((s) => Padding(
                          padding: EdgeInsets.only(bottom: 4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(s['subject'] ?? ''),
                              Text('${s['marks']}/${s['max_marks']}'),
                            ],
                          ),
                        )),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
    );
  }
}
