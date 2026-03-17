# Load Test Guide - 30 Concurrent Users

## Option 1: Simple Node.js Load Test (Recommended for quick test)

### Setup
```bash
cd backend
node load-test.js
```

### What it does:
- Registers 30 test users
- Each user places 3 orders concurrently
- Total: 90 orders placed at the same time
- Measures response times and success rate

### Expected Output:
```
📊 LOAD TEST RESULTS
==============================================================
📈 Metrics:
  Total Requests: 90
  Successful: 85 ✓
  Failed: 5 ✗
  Success Rate: 94.44%

⏱️ Response Times:
  Average: 245.32ms
  Min: 120ms
  Max: 890ms

⏳ Total Time: 12.45s
==============================================================
✅ EXCELLENT: System can handle 30 concurrent users
```

## Option 2: Advanced Locust Load Test (For detailed analysis)

### Installation
```bash
pip install locust requests
```

### Run Test
```bash
locust -f load_test_locust.py --host=https://fsi-dds.onrender.com
```

Then open http://localhost:8089 in your browser

### Features:
- Real-time monitoring dashboard
- Detailed statistics per endpoint
- Response time distribution
- Failure analysis
- Customizable user count and spawn rate

### Configuration in Web UI:
- Number of users: 30
- Spawn rate: 5 users/second
- Run time: 5-10 minutes

## Performance Targets

### Acceptable Performance:
- ✅ Success Rate: > 95%
- ✅ Average Response Time: < 500ms
- ✅ 95th Percentile: < 1000ms
- ✅ Error Rate: < 5%

### Good Performance:
- ✅ Success Rate: > 98%
- ✅ Average Response Time: < 300ms
- ✅ 95th Percentile: < 500ms
- ✅ Error Rate: < 2%

### Excellent Performance:
- ✅ Success Rate: 100%
- ✅ Average Response Time: < 200ms
- ✅ 95th Percentile: < 300ms
- ✅ Error Rate: 0%

## Troubleshooting

### High Response Times
1. Check database indexes: Run `ADD-INDEXES.sql`
2. Check rate limiting: Increase limit in `backend/server.js`
3. Check Render.com resources: Upgrade to Standard tier

### High Error Rate
1. Check API logs: `heroku logs --tail` or Render dashboard
2. Check database connections: Monitor in Supabase
3. Check CORS settings: Verify allowed origins

### Connection Refused
1. Ensure API is deployed and running
2. Check API URL is correct
3. Check firewall/network settings

## Monitoring During Test

### Real-time Metrics:
```bash
# Watch API logs
tail -f backend/logs.txt

# Monitor database connections
# In Supabase dashboard: Database > Connections
```

### After Test:
1. Check error logs for patterns
2. Review slow query logs
3. Analyze response time distribution
4. Identify bottlenecks

## Optimization Tips

If performance is below targets:

1. **Database:**
   - Run `ADD-INDEXES.sql` to add missing indexes
   - Check query performance with EXPLAIN ANALYZE

2. **Backend:**
   - Increase rate limit threshold
   - Enable response compression
   - Add more caching

3. **Frontend:**
   - Reduce bundle size
   - Enable code splitting
   - Use service workers

4. **Infrastructure:**
   - Upgrade Render.com tier
   - Enable auto-scaling
   - Use CDN for static assets

## Continuous Testing

Run load tests regularly:
- After each deployment
- Before major releases
- When adding new features
- When performance degrades

## Load Test Results Template

```
Date: YYYY-MM-DD
Environment: Production
Concurrent Users: 30
Total Orders: 90

Results:
- Success Rate: XX%
- Avg Response Time: XXms
- Max Response Time: XXms
- Errors: X

Status: ✅ PASS / ⚠️ NEEDS IMPROVEMENT / ❌ FAIL

Notes:
- ...
```
