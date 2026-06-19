import 'package:flutter/material.dart';
import '../services/api_service.dart';

class FeesScreen extends StatefulWidget {
  @override
  State<FeesScreen> createState() => _FeesScreenState();
}

class _FeesScreenState extends State<FeesScreen> {
  List<dynamic> _fees = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadFees();
  }

  Future<void> _loadFees() async {
    try {
      final data = await ApiService.get('/api/fees/');
      setState(() {
        _fees = data['fees'] as List<dynamic>;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'paid': return Colors.green;
      case 'pending': return Colors.orange;
      case 'overdue': return Colors.red;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Fees')),
      body: _loading
        ? Center(child: CircularProgressIndicator())
        : ListView.builder(
            padding: EdgeInsets.all(16),
            itemCount: _fees.length,
            itemBuilder: (_, i) {
              final fee = _fees[i];
              final status = fee['status'] ?? 'pending';
              return Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(fee['fee_type'] ?? '', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            SizedBox(height: 4),
                            Text('Due: ${fee['due_date'] ?? ''}', style: TextStyle(color: Colors.grey)),
                            SizedBox(height: 4),
                            Text('Amount: Rs.${fee['amount'] ?? 0}', style: TextStyle(fontSize: 14)),
                          ],
                        ),
                      ),
                      Chip(
                        label: Text(status.toUpperCase(), style: TextStyle(color: Colors.white, fontSize: 11)),
                        backgroundColor: _statusColor(status),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
    );
  }
}
