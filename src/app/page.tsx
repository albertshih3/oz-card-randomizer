"use client";

import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { 
  Container, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  ThemeProvider,
  createTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useReactToPrint } from 'react-to-print';

// Initialize Firebase (replace with your config)
const firebaseConfig = {
  apiKey: "AIzaSyAtKLKB3-Nl0fP-9yeYd9SywiMXyAgtpLM",
  authDomain: "oz-card-randomizer.firebaseapp.com",
  projectId: "oz-card-randomizer",
  storageBucket: "oz-card-randomizer.appspot.com",
  messagingSenderId: "1060427616291",
  appId: "1:1060427616291:web:30e164d8a82a8d8899a196",
  measurementId: "G-D3P5Y0M38K"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collections = [
  { id: 'africansavanna', name: 'African Savannah' },
  { id: 'californiatrail', name: 'California Trail' },
  { id: 'childrenszoo', name: 'Children\'s Zoo' },
  { id: 'tropicalrainforest', name: 'Tropical Rainforest' },
  { id: 'specialedition', name: 'Special Edition' }
];

// Create a custom theme
const theme = createTheme({
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          boxShadow: 'none',
          border: '1px solid #e0e0e0',
        },
      },
    },
  },
});

export default function Home() {
  const [boosterPacks, setBoosterPacks] = useState<any[][]>([]);
  const [cardsData, setCardsData] = useState<{ [key: string]: any }>({});
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  const [expandedPacks, setExpandedPacks] = useState<number[]>([]);
  const componentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const data: { [key: string]: any } = {};
      for (const col of [...collections.map(c => c.id), 'spoonbill']) {
        const querySnapshot = await getDocs(collection(db, col));
        data[col] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      setCardsData(data);
    };

    fetchData();
  }, []);

  const generateBoosterPack = () => {
    const pack: any[] = [];
    const usedCards = new Set();

    const addCard = (collection: string) => {
      let card;
      do {
        card = cardsData[collection][Math.floor(Math.random() * cardsData[collection].length)];
      } while (usedCards.has(`${collection}-${card.id}`));
      pack.push({ ...card, collection });
      usedCards.add(`${collection}-${card.id}`);
    };

    // Steps 1-3
    for (const col of collections.slice(0, 4).map(c => c.id)) {
      addCard(col);
      addCard(col);
    }

    // Steps 4-5
    const randomCollection = collections[Math.floor(Math.random() * (collections.length - 1))].id;
    addCard(randomCollection);

    // Step 6
    addCard('spoonbill');

    return pack;
  };

  const generatePacks = (count: number) => {
    const newPacks = [];
    for (let i = 0; i < count; i++) {
      newPacks.push(generateBoosterPack());
    }
    setBoosterPacks(newPacks);
    setCheckedItems({});
    // Set only the first pack to be expanded if count > 1
    setExpandedPacks(count === 1 ? [0] : []);
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current || null,
  });

  const handleCheck = (packIndex: number, cardIndex: number) => {
    setCheckedItems(prev => ({
      ...prev,
      [`${packIndex}-${cardIndex}`]: !prev[`${packIndex}-${cardIndex}`]
    }));
  };

  const getCollectionName = (id: string) => {
    const collection = collections.find(c => c.id === id);
    return collection ? collection.name : 'Spoonbill';
  };

  const handleAccordionChange = (panel: number) => (event: any, isExpanded: any) => {
    setExpandedPacks(prev => 
      isExpanded ? [...prev, panel] : prev.filter(p => p !== panel)
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg" sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Booster Pack Generator
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Button variant="contained" onClick={() => generatePacks(1)} sx={{ mr: 1 }}>Generate 1 Pack</Button>
          <Button variant="contained" onClick={() => generatePacks(5)} sx={{ mr: 1 }}>Generate 5 Packs</Button>
          <Button variant="contained" onClick={() => generatePacks(10)} sx={{ mr: 1 }}>Generate 10 Packs</Button>
          <Button variant="contained" onClick={() => generatePacks(20)} sx={{ mr: 1 }}>Generate 20 Packs</Button>
          <Button variant="contained" onClick={handlePrint}>Print</Button>
        </Box>
        <div ref={componentRef}>
          {boosterPacks.map((pack, packIndex) => (
            <Accordion 
              key={packIndex}
              expanded={expandedPacks.includes(packIndex)}
              onChange={handleAccordionChange(packIndex)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Booster Pack #{packIndex + 1}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper} sx={{ backgroundColor: '#ffffff' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Collection</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Number</TableCell>
                        <TableCell>Done</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pack.map((card, cardIndex) => (
                        <TableRow key={cardIndex}>
                          <TableCell>{getCollectionName(card.collection)}</TableCell>
                          <TableCell>{card.name}</TableCell>
                          <TableCell>{card.number}</TableCell>
                          <TableCell>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={!!checkedItems[`${packIndex}-${cardIndex}`]}
                                  onChange={() => handleCheck(packIndex, cardIndex)}
                                />
                              }
                              label=""
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
      </Container>
    </ThemeProvider>
  );
}