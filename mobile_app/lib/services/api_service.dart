import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'http://10.0.2.2:8000';
  static String? _token;

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
  }

  static Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  static Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  static Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }

  static Future<Map<String, dynamic>> login(String username, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      await setToken(data['access_token']);
      return data;
    }
    throw Exception(jsonDecode(res.body)['detail'] ?? 'Login failed');
  }

  static Future<Map<String, dynamic>> get(String endpoint) async {
    final res = await http.get(Uri.parse('$baseUrl$endpoint'), headers: _headers);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('GET $endpoint failed: ${res.statusCode}');
  }

  static Future<Map<String, dynamic>> post(String endpoint, {Map<String, dynamic>? body}) async {
    final res = await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: _headers,
      body: body != null ? jsonEncode(body) : null,
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('POST $endpoint failed: ${res.statusCode}');
  }

  static Future<List<dynamic>> getList(String endpoint) async {
    final res = await http.get(Uri.parse('$baseUrl$endpoint'), headers: _headers);
    if (res.statusCode == 200) return jsonDecode(res.body) as List<dynamic>;
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data is List) return data;
      if (data is Map && data.containsKey('records')) return data['records'] as List<dynamic>;
      if (data is Map && data.containsKey('students')) return data['students'] as List<dynamic>;
      if (data is Map && data.containsKey('notifications')) return data['notifications'] as List<dynamic>;
      if (data is Map && data.containsKey('entries')) return data['entries'] as List<dynamic>;
      if (data is Map && data.containsKey('fees')) return data['fees'] as List<dynamic>;
      if (data is Map && data.containsKey('subjects')) return data['subjects'] as List<dynamic>;
    }
    throw Exception('GET $endpoint failed: ${res.statusCode}');
  }
}
