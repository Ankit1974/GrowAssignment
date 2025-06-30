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

const AddToWatchlistModal: React.FC<Props> = ({ visible, onClose, symbol }) => {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [newName, setNewName] = useState('');
  const [selected, setSelected] = useState<{ [name: string]: boolean }>({});

  useEffect(() => {
    if (visible) {
      loadWatchlists();
    }
  }, [visible]);

  const loadWatchlists = async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    let lists: Watchlist[] = [];
    if (data) lists = JSON.parse(data);
    setWatchlists(lists);
    // Set selected checkboxes for this symbol
    const sel: { [name: string]: boolean } = {};
    lists.forEach(wl => {
      sel[wl.name] = wl.stocks.includes(symbol);
    });
    setSelected(sel);
  };

  const saveWatchlists = async (lists: Watchlist[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    setWatchlists(lists);
  };

  const handleAddWatchlist = () => {
    if (!newName.trim()) return;
    if (watchlists.some(wl => wl.name === newName.trim())) return;
    const newList = [...watchlists, { name: newName.trim(), stocks: [] }];
    saveWatchlists(newList);
    setNewName('');
  };

  const handleToggle = (name: string) => {
    const updated = watchlists.map(wl => {
      if (wl.name !== name) return wl;
      const exists = wl.stocks.includes(symbol);
      return {
        ...wl,
        stocks: exists ? wl.stocks.filter(s => s !== symbol) : [...wl.stocks, symbol],
      };
    });
    saveWatchlists(updated);
    setSelected(sel => ({ ...sel, [name]: !sel[name] }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.modalBox}>
        <Text style={styles.title}>Add to Watchlist</Text>
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
        <FlatList
          data={watchlists}
          keyExtractor={item => item.name}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.watchlistRow} onPress={() => handleToggle(item.name)}>
              <View style={styles.checkbox}>{selected[item.name] ? <View style={styles.checked} /> : null}</View>
              <Text style={styles.watchlistName}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={{ color: '#888', marginTop: 12 }}>No watchlists yet.</Text>}
        />
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
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
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
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
  addBtn: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addBtnText: { fontWeight: 'bold', fontSize: 15 },
  watchlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
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
  checked: {
    width: 14,
    height: 14,
    backgroundColor: '#2ecc71',
    borderRadius: 2,
  },
  watchlistName: { fontSize: 16 },
  closeBtn: {
    marginTop: 18,
    alignSelf: 'center',
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  closeBtnText: { fontWeight: 'bold', fontSize: 15 },
});

export default AddToWatchlistModal; 