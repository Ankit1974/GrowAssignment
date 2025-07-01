import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Watchlist {
  name: string;
  stocks: string[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  symbol: string;
}

const STORAGE_KEY = 'watchlists';


 // Modal component for adding a stock symbol to existing watchlists or creating new ones
const AddToWatchlistModal: React.FC<Props> = ({ visible, onClose, symbol }) => {
  // State to store all watchlists
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  // State for the new watchlist name input
  const [newName, setNewName] = useState('');
  // State to track which watchlists are selected
  const [selected, setSelected] = useState<{ [name: string]: boolean }>({});

  // Load watchlists when modal becomes visible
  useEffect(() => {
    if (visible) {
      loadWatchlists();
    }
  }, [visible]);

   // Load watchlists from AsyncStorage and update selected state
  const loadWatchlists = async () => {
    // Retrieve watchlist data from storage
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    let lists: Watchlist[] = [];
    if (data) lists = JSON.parse(data);
    setWatchlists(lists);
    
    // Update selected state based on which watchlists contain the current symbol
    const sel: { [name: string]: boolean } = {};
    lists.forEach(wl => {
      sel[wl.name] = wl.stocks.includes(symbol);
    });
    setSelected(sel);
  };

   // Save watchlists to AsyncStorage and update local state
  const saveWatchlists = async (lists: Watchlist[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    setWatchlists(lists);
  };

   // Create a new watchlist with the entered name
  const handleAddWatchlist = () => {
    // Validate input 
    if (!newName.trim()) return;
    // Check if watchlist name already exists
    if (watchlists.some(wl => wl.name === newName.trim())) return;
    
    // Create new watchlist and add to existing list
    const newList = [...watchlists, { name: newName.trim(), stocks: [] }];
    saveWatchlists(newList);
    setNewName('');
  };

   // Toggle a stock symbol in/out of a specific watchlist
  const handleToggle = (name: string) => {
    // Update watchlists by adding/removing the symbol from the specified watchlist
    const updated = watchlists.map(wl => {
      if (wl.name !== name) return wl;
      
      // Check if symbol already exists in this watchlist
      const exists = wl.stocks.includes(symbol);
      return {
        ...wl,
        // Add symbol if it doesn't exist, remove if it does
        stocks: exists ? wl.stocks.filter(s => s !== symbol) : [...wl.stocks, symbol],
      };
    });
    
    // Save updated watchlists and update selected state
    saveWatchlists(updated);
    setSelected(sel => ({ ...sel, [name]: !sel[name] }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Overlay to close modal when tapped outside */}
      <Pressable style={styles.overlay} onPress={onClose} />
      
      {/* Main modal content container */}
      <View style={styles.modalBox}>
        {/* Modal title */}
        <Text style={styles.title}>Add to Watchlist</Text>
        
        {/* Input row for creating new watchlist */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="New Watchlist Name"
            value={newName}
            onChangeText={setNewName}
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddWatchlist}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        
        {/* List of existing watchlists */}
        <FlatList
          data={watchlists}
          keyExtractor={item => item.name}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.watchlistRow} onPress={() => handleToggle(item.name)}>
              {/* Custom checkbox showing selection state */}
              <View style={styles.checkbox}>
                {selected[item.name] ? <View style={styles.checked} /> : null}
              </View>
              <Text style={styles.watchlistName}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={{ color: '#888', marginTop: 12 }}>No watchlists yet.</Text>}
        />
        
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// Styles for the modal component
const styles = StyleSheet.create({
  // transparent overlay behind the modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  // Main modal 
  modalBox: {
    position: 'absolute',
    top: '20%',
    left: '5%',
    right: '5%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    zIndex: 10,
  },
  // Modal title 
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 16 
  },
  //  for input field and add button
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  // Text input for new watchlist name
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    marginRight: 8,
  },
  // Add button styling
  addBtn: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addBtnText: { 
    fontWeight: 'bold', 
    fontSize: 15 
  },
  // Individual watchlist row container
  watchlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  // Custom checkbox container
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#888',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Checked state indicator
  checked: {
    width: 14,
    height: 14,
    backgroundColor: '#2ecc71',
    borderRadius: 2,
  },
  // Watchlist name text
  watchlistName: { 
    fontSize: 16 
  },
  // Close button styling
  closeBtn: {
    marginTop: 18,
    alignSelf: 'center',
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  closeBtnText: { 
    fontWeight: 'bold', 
    fontSize: 15 
  },
});

export default AddToWatchlistModal; 