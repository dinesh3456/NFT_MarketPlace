import Navbar from "./Navbar";
import NFTTile from "./NFTTile";
import NFTMarketplace from "../NFTMarketplace.json";
import axios from "axios";
import { useState } from "react";
import { GetIpfsUrlFromPinata } from "../utils";
const ethers = require("ethers");


export default function Marketplace() {
  const sampleData = [
    {
      name: "NFT#1",
      description: "First NFT",
      website: "http://axieinfinity.io",
      image:
        "https://gateway.pinata.cloud/ipfs/QmSSrNfQSyGqX9P3v8UiTdNAs6vSGztuqYWvR3EExR4DXA",
      price: "0.01ETH",
      currentlySelling: "True",
      address: "0x0dd73dFD9b7A652294BEc315316687Df80544c06",
    },
    {
      name: "NFT#2",
      description: "Second NFT",
      website: "http://axieinfinity.io",
      image:
        "https://gateway.pinata.cloud/ipfs/QmcTXJHNScozaRjpbWBSa5in1oSveNZ2ys2fqaguWBWnMX",
      price: "0.01ETH",
      currentlySelling: "True",
      address: "0x0dd73dFD9b7A652294BEc315316687Df80544c06",
    },
    {
      name: "NFT#3",
      description: "Third NFT",
      website: "http://axieinfinity.io",
      image:
        "https://gateway.pinata.cloud/ipfs/QmahFv93WYBm455o6ixjbVfJFe9xgePnUVQG6Fnu3yp4M4",
      price: "0.01ETH",
      currentlySelling: "True",
      address: "0x0dd73dFD9b7A652294BEc315316687Df80544c06",
    },
  ];
  const [data, updateData] = useState(sampleData);
  const [dataFetched, updateFetched] = useState(false);

  async function getAllNFTs() {
    try{
     // if(typeof window.ethereum !== 'undefined'){
        
      
       // const ethers = require("ethers");
       
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        let contract = new ethers.Contract(NFTMarketplace.address,NFTMarketplace.abi,signer);
        
        let transaction = await contract.getAllNfts();
        console.log("getting things ready");
        const items = await Promise.all(transaction.map(async i =>{
        var tokenURI = await contract.tokenURI(i.tokenId);
        console.log("Getting the tokenURI: ", tokenURI);
        tokenURI = await GetIpfsUrlFromPinata(tokenURI);
        let metadata = await axios.get(tokenURI);
        metadata = metadata.data;

        let price = ethers.utils.formatUnits(i.price.toString(), "ether");
        let item={
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner : i.owner,
          image: metadata.image,
          name: metadata.name,
          description:metadata.description,
        }
    
   
        return item;
      }))
      updateFetched(true);
      updateData(items);
    // }else{
    // console.log("Provider not found !!");
  // }
  }
    catch(e){
      console.log("Error in fetching NFTs: ", e);
    }
  }

  if (!dataFetched) getAllNFTs();

  return (
    <div>
      <Navbar></Navbar>
      <div className="flex flex-col place-items-center mt-20">
        <div className="md:text-xl font-bold text-black">Top NFTs</div>
        <div className="flex mt-5 justify-between flex-wrap max-w-screen-xl text-center">
          {data.map((value, index) => {
            return <NFTTile data={value} key={index}></NFTTile>;
          })}
        </div>
      </div>
    </div>
  );
}
