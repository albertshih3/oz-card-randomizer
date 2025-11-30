import { useState, useEffect } from "react";
import {
    Modal, ModalHeader, ModalBody, ModalFooter,
} from "@heroui/modal";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Select, SelectItem } from "@heroui/select";
import { Form } from "@heroui/form";

const collections = [
    { id: "africansavanna", name: "African Savannah" },
    { id: "californiatrail", name: "California Trail" },
    { id: "childrenszoo", name: "Children's Zoo" },
    { id: "tropicalrainforest", name: "Tropical Rainforest" },
    { id: "specialedition", name: "Special Edition" },
    { id: "booatthezoo", name: "Boo at the Zoo" },
    { id: "arcas", name: "ARCAS" },
    { id: "newnaturefoundation", name: "New Nature Foundation" },
    { id: "disney", name: "Disney" },
];

interface CardDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (card: { name: string; number: string; active: boolean; category: string }) => void;
    onDelete?: (card: { name: string; number: string; active: boolean; category: string }) => void;
    editingCard?: { name: string; number: string; active: boolean; collection: string };
}

export default function CardDialog({
    open,
    onClose,
    onSave,
    onDelete,
    editingCard,
}: CardDialogProps) {
    const [name, setName] = useState("");
    const [number, setNumber] = useState("");
    const [active, setActive] = useState(false);
    const [category, setCategory] = useState("");

    useEffect(() => {
        if (editingCard) {
            setName(editingCard.name || "");
            setNumber(editingCard.number || "");
            setActive(editingCard.active || false);
            setCategory(editingCard.collection || "");
        } else {
            setName("");
            setNumber("");
            setActive(false);
            setCategory("");
        }
    }, [editingCard]);

    const handleSave = () => {
        onSave({ name, number, active, category });
    };

    const handleDelete = () => {
        if (editingCard && onDelete) {
            onDelete({ ...editingCard, category: editingCard.collection });
        }
    };

    return (
        <Modal backdrop='blur' isOpen={open} onClose={onClose} className="max-w-lg w-full mx-auto">
            <ModalHeader>{editingCard ? "Edit Card" : "Create Card"}</ModalHeader>
            <ModalBody>
                <Form>
                    <Input
                        label="Card Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                    />
                    <Input
                        label="Card Number"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        fullWidth
                    />
                    <Select
                        label="Category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        fullWidth
                    >
                        {collections.map((collection) => (
                            <SelectItem key={collection.id}>
                                {collection.name}
                            </SelectItem>
                        ))}
                    </Select>
                    <div style={{ display: "flex", alignItems: "center", marginTop: "16px" }}>
                        <Switch
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                        />
                        <span style={{ marginLeft: "8px" }}>Active</span>
                    </div>
                </Form>
            </ModalBody>
            <ModalFooter>
                {editingCard && (
                    <Button
                        onClick={handleDelete}
                        variant="bordered"
                        color="secondary"
                        style={{ marginRight: "auto" }}
                    >
                        Delete Card
                    </Button>
                )}
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="solid" color="primary">
                    {editingCard ? "Save Changes" : "Create"}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
