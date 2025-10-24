const io = require('socket.io-client');

// Simulate Tomas connecting and tracking Maka
async function testRealTimeLocationSharing() {
  console.log('🧪 Testing real-time location sharing...\n');

  // Connect Tomas (the viewer)
  const tomasSocket = io.connect('http://localhost:3000/realtime', {
    auth: { token: 'dev-token-12345' },
    extraHeaders: { 'x-dev-user-id': '68f6ab1bbeb725bab56c9b7d' },
  });

  // Connect Maka (the location sharer)
  const makaSocket = io.connect('http://localhost:3000/realtime', {
    auth: { token: 'dev-token-12345' },
    extraHeaders: { 'x-dev-user-id': '68f6ae6002b320718fc9482f' },
  });

  // Setup Tomas listeners
  tomasSocket.on('connect', () => {
    console.log('✅ Tomas connected to realtime namespace');

    // Tomas starts tracking Maka's location
    tomasSocket.emit('location:track', {
      friendId: '68f6ae6002b320718fc9482f', // Maka's ID
      durationSec: 300,
    });
  });

  tomasSocket.on('location:track:ack', data => {
    console.log('✅ Tomas tracking acknowledged:', data);
  });

  tomasSocket.on('location:update', data => {
    console.log('📍 Tomas received location update:', data);
  });

  // Setup Maka listeners
  makaSocket.on('connect', () => {
    console.log('✅ Maka connected to realtime namespace');

    // Wait a bit then send location update
    setTimeout(() => {
      console.log('📤 Maka sending location update...');
      makaSocket.emit('location:ping', {
        lat: 49.2606,
        lng: -123.246,
        accuracyM: 5,
      });
    }, 2000);
  });

  makaSocket.on('location:ping:ack', data => {
    console.log('✅ Maka location ping acknowledged:', data);
  });

  // Handle errors
  tomasSocket.on('connect_error', err => {
    console.error('❌ Tomas connection error:', err.message);
  });

  makaSocket.on('connect_error', err => {
    console.error('❌ Maka connection error:', err.message);
  });

  // Keep alive for testing
  setTimeout(() => {
    console.log('\n🔚 Test complete, disconnecting...');
    tomasSocket.disconnect();
    makaSocket.disconnect();
    process.exit(0);
  }, 10000);
}

testRealTimeLocationSharing().catch(console.error);
