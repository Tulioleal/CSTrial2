import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as DATA from "../MOCK_DATA.json";
import * as fs from "fs";

admin.initializeApp();

interface Team {
  teamName: string
  score: number
}

interface TeamToJson extends Team{
  percetile: string
}

exports.getPorcentile = functions.https.onRequest(async (req, res) => {

  const snapshot = await admin.firestore()
                          .collection('teams')
                          .orderBy('score')
                          .get();

  let docsFB = snapshot.docs
  let docsMock:Team[] = DATA
  let result:Team[] = []

  if ( docsFB ) {
    result = addAndFinPercentile(docsFB)
  } else {
    result = sortAndFindPersentile(docsMock)
  }

  res.json({result: JSON.stringify(result)});
});

exports.getPorcentileMassive = functions.https.onRequest(async (req, res) => {

  const db = admin.firestore() 
  const promiseQuery:Promise<FirebaseFirestore.DocumentData>[] = []
  const teams:Team[] = []
  const divider:number = 5
  const size:number = parseInt(req.query.size as string)
  const elementsByReq = size / divider

  for (let i = 0; i < divider; i++) {

    const snapshot = db.collection('teams')
      .orderBy('score')
      .offset(i * elementsByReq)
      .limit(elementsByReq)
      .get();

      promiseQuery.push(snapshot)
  }

  await Promise.all(promiseQuery)
    .then( query => {
      query.forEach( (element:FirebaseFirestore.DocumentData) => {
        element.docs.forEach( (team:FirebaseFirestore.DocumentData) => {
          teams.push(team.data())
        })
      })
    })

  const teamToJson:TeamToJson[] = findPorcentile(teams)

  res.json({result: JSON.stringify(teamToJson)})

});

function addAndFinPercentile(data:FirebaseFirestore.DocumentData[]) {
  let docsFromFB:Team[] = []

  data.forEach((doc) => {
    docsFromFB.push(doc.data() as Team)
  })

  return findPorcentile(docsFromFB)
}

function sortAndFindPersentile(data:Team[]) {

  data.sort( ( a , b ) => {
    if(a.score > b.score) return 1;
    if(a.score < b.score) return -1;
    return 0;
  });

  let docsFromMock = data

  return findPorcentile(docsFromMock)
}

function findPorcentile(data:Team[]):TeamToJson[] {

  const percentiles = [10,50,90]
  const result:TeamToJson[] = []

  percentiles.forEach((percentile) => {
    let n:number = (percentile/100) * data.length
    n = Math.floor(n)

    result.push({...data[n], percetile:`${percentile}th`})
  })

  let fileData = JSON.stringify(result);
  fs.writeFileSync('RESULT.json', fileData);

  return result

}