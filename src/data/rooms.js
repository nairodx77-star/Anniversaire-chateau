export const rooms = [
  {
    id: "antoine",
    building: "Château",
    name: "Chambre d’Antoine",
    atmosphere: "Calme et classique",
    image: "/images/chambre-antoine.jpg",
    description: "Une chambre élégante du château, parfaite pour un couple ou deux personnes proches.",
    beds: [
      {
        id: "antoine-double",
        label: "Lit double",
        type: "double",
        sleeps: 2,
      },
    ],
  },
  {
    id: "bruno",
    building: "Château",
    name: "Chambre de Bruno",
    atmosphere: "Intime et confortable",
    image: "/images/chambre-bruno.jpg",
    description: "Une chambre confortable, idéale pour deux personnes.",
    beds: [
      {
        id: "bruno-double",
        label: "Lit double",
        type: "double",
        sleeps: 2,
      },
    ],
  },
  {
    id: "jean-yves",
    building: "Château",
    name: "Chambre de Jean-Yves",
    atmosphere: "Pratique et conviviale",
    image: "/images/chambre-jean-yves.jpg",
    description: "Une chambre avec un lit double et un lit simple, pratique pour un couple avec un ami ou un enfant.",
    beds: [
      {
        id: "jean-yves-double",
        label: "Lit double",
        type: "double",
        sleeps: 2,
      },
      {
        id: "jean-yves-simple",
        label: "Lit simple",
        type: "single",
        sleeps: 1,
      },
    ],
  },
  {
    id: "empire",
    building: "Château",
    name: "Chambre Empire",
    atmosphere: "Prestige discret",
    image: "/images/chambre-empire.jpg",
    description: "Une chambre de caractère, dans l’esprit noble et feutré du château.",
    beds: [
      {
        id: "empire-double",
        label: "Lit double",
        type: "double",
        sleeps: 2,
      },
    ],
  },
  {
    id: "orange",
    building: "Château",
    name: "Chambre orange",
    atmosphere: "Chaleureuse",
    image: "/images/chambre-orange.jpg",
    description: "Une chambre lumineuse et chaleureuse, pensée pour deux personnes.",
    beds: [
      {
        id: "orange-double",
        label: "Lit double",
        type: "double",
        sleeps: 2,
      },
    ],
  },
  {
    id: "rose",
    building: "Château",
    name: "Chambre rose",
    atmosphere: "Douce et raffinée",
    image: "/images/chambre-rose.jpg",
    description: "Une chambre avec deux couchages simples, idéale pour deux amis.",
    beds: [
      {
        id: "rose-simple-1",
        label: "Lit simple 1",
        type: "single",
        sleeps: 1,
      },
      {
        id: "rose-simple-2",
        label: "Lit simple 2",
        type: "single",
        sleeps: 1,
      },
    ],
  },
  {
    id: "chinoise",
    building: "Château",
    name: "Chambre Chinoise",
    atmosphere: "Singulière et voyageuse",
    image: "/images/chambre-chinoise.jpg",
    description: "Une chambre au charme particulier, inspirée par les voyages et les objets d’ailleurs.",
    beds: [
      {
        id: "chinoise-double",
        label: "Lit double",
        type: "double",
        sleeps: 2,
      },
    ],
  },
  {
    id: "basse-porte",
    building: "La Ferme",
    name: "Chambre de la Basse Porte",
    atmosphere: "Simple et pratique",
    image: "/images/chambre-basse-porte.jpg",
    description: "Une chambre située côté ferme, avec un couchage double et un couchage individuel.",
    beds: [
      {
        id: "basse-porte-double",
        label: "Lit double",
        type: "double",
        sleeps: 2,
      },
      {
        id: "basse-porte-simple",
        label: "Lit escamotable",
        type: "single",
        sleeps: 1,
      },
    ],
  },
  {
    id: "haute-porte",
    building: "La Ferme",
    name: "Chambre de la Haute Porte",
    atmosphere: "Authentique",
    image: "/images/chambre-haute-porte.jpg",
    description: "Une chambre confortable côté ferme, pensée pour trois couchages.",
    beds: [
      {
        id: "haute-porte-double",
        label: "Lit double",
        type: "double",
        sleeps: 2,
      },
      {
        id: "haute-porte-simple",
        label: "Lit simple",
        type: "single",
        sleeps: 1,
      },
    ],
  },
  {
    id: "champs",
    building: "La Ferme",
    name: "Chambre des champs",
    atmosphere: "Familiale et détendue",
    image: "/images/chambre-champs.jpg",
    description: "Une chambre idéale pour un petit groupe, avec lit double et lits superposés.",
    beds: [
      {
        id: "champs-double",
        label: "Lit double",
        type: "double",
        sleeps: 2,
      },
      {
        id: "champs-superpose-1",
        label: "Lit superposé 1",
        type: "single",
        sleeps: 1,
      },
      {
        id: "champs-superpose-2",
        label: "Lit superposé 2",
        type: "single",
        sleeps: 1,
      },
    ],
  },
  {
    id: "familiale",
    building: "La Ferme",
    name: "Chambre familiale",
    atmosphere: "Grande tablée, grande chambre",
    image: "/images/chambre-familiale.jpg",
    description: "La plus grande chambre, parfaite pour un groupe ou une famille.",
    beds: [
      {
        id: "familiale-double-1",
        label: "Lit double 1",
        type: "double",
        sleeps: 2,
      },
      {
        id: "familiale-double-2",
        label: "Lit double 2",
        type: "double",
        sleeps: 2,
      },
      {
        id: "familiale-simple",
        label: "Lit simple",
        type: "single",
        sleeps: 1,
      },
      {
        id: "familiale-escamotable",
        label: "Lit escamotable",
        type: "single",
        sleeps: 1,
      },
    ],
  },
];

export function getRoomCapacity(room) {
  return room.beds.reduce((total, bed) => total + bed.sleeps, 0);
}

export function getAllSleepSlots() {
  return rooms.flatMap((room) =>
    room.beds.flatMap((bed) =>
      Array.from({ length: bed.sleeps }, (_, index) => ({
        id: `${bed.id}-slot-${index + 1}`,
        roomId: room.id,
        roomName: room.name,
        building: room.building,
        bedId: bed.id,
        bedLabel: bed.label,
        sleepNumber: index + 1,
        bedType: bed.type,
      }))
    )
  );
}
