const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

// Enable CORS for all requests
app.use(cors());

// Serve static files from the "nft_markers" directory
app.use('/nft_markers', express.static(path.join(__dirname, 'nft_markers'), { dotfiles: 'allow' }));


app.use(express.static('path_to_directory', {
    dotfiles: 'allow', // This allows serving hidden files
}));


// Default route for testing
app.get('/', (req, res) => {
    res.send('Server is running, and CORS is enabled.');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://127.0.0.1:${PORT}`);
});
