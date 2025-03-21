async function initializeCollections() {
  try {
    const response = await fetch('http://localhost:3000/api/init-collections');
    const data = await response.json();
    console.log('Initialization response:', data);
  } catch (error) {
    console.error('Failed to initialize collections:', error);
  }
}

initializeCollections(); 