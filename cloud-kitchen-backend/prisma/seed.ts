import { prisma } from "../src/lib/prisma";

async function main() {
  const existingCount = await prisma.product.count();
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} products.`);
    return;
  }

  const products = [
    {
      name: "Royal Hyderabadi Dum Biryani",
      description: "Aromatic basmati rice layered with tender meat marinated in saffron, caramelized onions, and stone-ground Awadhi spices, sealed in a dough-rimmed handi and slow cooked on dum.",
      price: 349.00,
      imageUrl: "/biryani.jpg",
      isAvailable: true,
    },
    {
      name: "Smoked Paneer Tikka Angara",
      description: "Farm-fresh malai paneer cubes marinated in hung curd, Kashmiri deghi mirch, and roasted mustard oil, char-grilled over live embers and finished with lemon glaze.",
      price: 289.00,
      imageUrl: "/paneer_tikka.jpg",
      isAvailable: true,
    },
    {
      name: "Dal Makhani Bukhara",
      description: "Black urad lentils simmered overnight for 18 hours over slow coal fire, infused with churned white butter, organic tomato reduction, and roasted kasuri methi.",
      price: 249.00,
      imageUrl: "/dal_makhani.jpg",
      isAvailable: true,
    },
    {
      name: "Crispy Ghee Podi Masala Dosa",
      description: "Fermented heirloom rice crepe roasted golden in artisanal A2 ghee, generously dusted with gun-powder podi and stuffed with spiced tempering potatoes.",
      price: 189.00,
      imageUrl: "/masala_dosa.jpg",
      isAvailable: true,
    },
    {
      name: "Shahi Gulab Jamun with Saffron",
      description: "Mawa and cottage cheese golden orbs dipped in fragrant green cardamom and pure Kashmiri saffron infused sugar syrup, served warm.",
      price: 149.00,
      imageUrl: "/gulab_jamun.jpg",
      isAvailable: true,
    },
    {
      name: "Old Delhi Butter Chicken Lazeez",
      description: "Tandoor-charred chicken steeped in a silky makhani gravy enriched with cashew nut paste, fresh cream, honey, and hand-pounded spices.",
      price: 389.00,
      imageUrl: "/biryani.jpg",
      isAvailable: true,
    },
  ];

  for (const item of products) {
    await prisma.product.create({ data: item });
  }

  console.log(`Successfully seeded ${products.length} gourmet dishes!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
