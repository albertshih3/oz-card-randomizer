"use client";

import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { useAuth } from "@clerk/nextjs";
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Switch, Button, Box } from "@mui/material";
import CardDialog from "../components/CardManagement";
import { ArrowUpward, ArrowDownward } from "@mui/icons-material";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const collections = [
  { id: "africansavanna", name: "African Savannah" },
  { id: "californiatrail", name: "California Trail" },
  { id: "childrenszoo", name: "Children's Zoo" },
  { id: "tropicalrainforest", name: "Tropical Rainforest" },
  { id: "specialedition", name: "Special Edition" },
  { id: "booatthezoo", name: "Boo at the Zoo" },
];

type SortDirection = 'asc' | 'desc';
type SortColumn = 'name' | 'number' | 'collection' | 'active';

export default function CardManagement() {
  const { getToken } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    const signIntoFirebaseWithClerk = async () => {
      const token = await getToken({ template: "integration_firebase" });
      await signInWithCustomToken(auth, token || "");
      fetchCards();
    };

    signIntoFirebaseWithClerk();
  }, [getToken]);

  const fetchCards = async () => {
    setLoading(true);
    const allCards: any[] = [];
    try {
      for (const collectionObj of collections) {
        const querySnapshot = await getDocs(collection(db, collectionObj.id));
        querySnapshot.forEach((doc) => {
          allCards.push({
            id: doc.id,
            collection: collectionObj.id,
            ...doc.data(),
          });
        });
      }
      setCards(allCards);
    } catch (err) {
      console.error("Error fetching cards:", err);
    }
    setLoading(false);
  };

  const toggleCardActive = async (card: any) => {
    const cardRef = doc(db, card.collection, card.id);
    const newActiveState = !card.active;
    try {
      await updateDoc(cardRef, { active: newActiveState });
      setCards((prevCards) =>
        prevCards.map((c) => (c.id === card.id ? { ...c, active: newActiveState } : c))
      );
    } catch (err) {
      console.error("Failed to toggle card active state:", err);
    }
  };

  const handleEditCard = (card: any) => {
    setEditingCard(card);
    setOpenDialog(true);
  };

  const handleCreateCard = () => {
    setEditingCard(null);
    setOpenDialog(true);
  };

  const handleDeleteCard = async (card: any) => {
    try {
      const cardRef = doc(db, card.collection, card.id);
      await deleteDoc(cardRef);
      setCards((prevCards) => prevCards.filter((c) => c.id !== card.id));
      setOpenDialog(false);
      setEditingCard(null);
    } catch (err) {
      console.error("Failed to delete card:", err);
    }
  };

  const handleSaveCard = async (cardData: any) => {
    try {
      if (editingCard) {
        const cardRef = doc(db, editingCard.collection, editingCard.id);
        await updateDoc(cardRef, cardData);
        setCards((prevCards) =>
          prevCards.map((c) =>
            c.id === editingCard.id ? { ...c, ...cardData } : c
          )
        );
      } else {
        const docRef = await addDoc(collection(db, cardData.category), cardData);
        setCards((prevCards) => [
          ...prevCards,
          { id: docRef.id, collection: cardData.category, ...cardData },
        ]);
      }
    } catch (err) {
      console.error("Error saving card:", err);
    } finally {
      setOpenDialog(false);
      setEditingCard(null);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedCards = () => {
    return [...cards].sort((a, b) => {
      let compareA, compareB;

      if (sortColumn === 'collection') {
        compareA = collections.find((c) => c.id === a.collection)?.name || '';
        compareB = collections.find((c) => c.id === b.collection)?.name || '';
      } else {
        compareA = a[sortColumn];
        compareB = b[sortColumn];
      }

      // Handle string values
      if (typeof compareA === 'string' && typeof compareB === 'string') {
        compareA = compareA.toLowerCase();
        compareB = compareB.toLowerCase();
      }
      
      // Handle numeric values
      if (sortColumn === 'number') {
        compareA = Number(compareA);
        compareB = Number(compareB);
      }

      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant="h4">Card Management</Typography>
      <Box display="flex" justifyContent="center" marginTop={2}>
        <Button variant="contained" color="primary" onClick={handleCreateCard}>
          Create Card
        </Button>
      </Box>
      <TableContainer component={Paper} style={{ marginTop: "20px" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell 
                onClick={() => handleSort('name')}
                style={{ cursor: 'pointer' }}
              >
                Name <SortIcon column="name" />
              </TableCell>
              <TableCell 
                onClick={() => handleSort('number')}
                style={{ cursor: 'pointer' }}
              >
                Number <SortIcon column="number" />
              </TableCell>
              <TableCell 
                onClick={() => handleSort('collection')}
                style={{ cursor: 'pointer' }}
              >
                Category <SortIcon column="collection" />
              </TableCell>
              <TableCell 
                onClick={() => handleSort('active')}
                style={{ cursor: 'pointer' }}
              >
                Active <SortIcon column="active" />
              </TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getSortedCards().map((card) => (
              <TableRow key={card.id}>
                <TableCell>{card.name}</TableCell>
                <TableCell>{card.number}</TableCell>
                <TableCell>{collections.find((c) => c.id === card.collection)?.name}</TableCell>
                <TableCell>
                  <Switch
                    checked={card.active}
                    onChange={() => toggleCardActive(card)}
                  />
                </TableCell>
                <TableCell>
                  <Button onClick={() => handleEditCard(card)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <CardDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
        editingCard={editingCard}
      />
    </Container>
  );
}